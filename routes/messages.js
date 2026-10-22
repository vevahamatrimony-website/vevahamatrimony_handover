const router = require('express').Router();
const { supabaseAdmin } = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');
const limits = require('../middleware/limits');


// Timeout constants
const TIMEOUT_MS = {
    QUERY: 15000,      // 15 seconds for database queries
};

// Helper: wrap promise with timeout
function withTimeout(promise, timeoutMs, operation) {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`${operation} timeout (${timeoutMs}ms)`)), timeoutMs)
        )
    ]);
}

// Plan message limits
const PLAN_LIMITS = {
    free:    { canMessage: false, limit: 0 },
    silver:  { canMessage: true,  limit: 15 },  // 15 per day (updated from 10)
    gold:    { canMessage: true,  limit: 10 },  // 10 per day
    diamond: { canMessage: true,  limit: Infinity },
    vip:     { canMessage: true,  limit: Infinity }
};

// No URLs in Gold plan messages
const URL_REGEX = /https?:\/\/[^\s]+|www\.[^\s]+/gi;

async function getUserPlan(userId) {
    const { data } = await withTimeout(
        supabaseAdmin
            .from('profiles')
            .select('plan_name, plan_expiry_date')
            .eq('id', userId)
            .single(),
        TIMEOUT_MS.QUERY,
        'getUserPlan'
    );

    if (!data) return 'free';

    // Check expiry
    if (data.plan_expiry_date && new Date(data.plan_expiry_date) < new Date()) {
        // Plan expired — downgrade to free
        await withTimeout(
            supabaseAdmin
                .from('profiles')
                .update({ plan_name: 'free', membership_status: 'expired' })
                .eq('id', userId),
            TIMEOUT_MS.QUERY,
            'downgradeExpiredPlan'
        );
        return 'free';
    }
    return data.plan_name || 'free';
}

async function getDailyMessageCount(userId) {
    const today = new Date().toISOString().split('T')[0];

    const { data } = await withTimeout(
        supabaseAdmin
            .from('plan_usage')
            .select('message_count')
            .eq('user_id', userId)
            .eq('week_start', today)   // reusing week_start column as day_start
            .single(),
        TIMEOUT_MS.QUERY,
        'getDailyMessageCount'
    );

    return { count: data?.message_count || 0, today };
}

async function incrementDailyMessageCount(userId, today) {
    const { data: existing } = await withTimeout(
        supabaseAdmin
            .from('plan_usage')
            .select('id, message_count')
            .eq('user_id', userId)
            .eq('week_start', today)   // reusing week_start column as day_start
            .single(),
        TIMEOUT_MS.QUERY,
        'getMessageCountRecord'
    );

    if (existing) {
        await withTimeout(
            supabaseAdmin
                .from('plan_usage')
                .update({ message_count: existing.message_count + 1 })
                .eq('id', existing.id),
            TIMEOUT_MS.QUERY,
            'incrementDailyMessageCount'
        );
    } else {
        await withTimeout(
            supabaseAdmin
                .from('plan_usage')
                .insert({ user_id: userId, message_count: 1, week_start: today }),
            TIMEOUT_MS.QUERY,
            'insertDailyMessageCountRecord'
        );
    }
}

// ══════════════════════════════════════════════════════════════
// GET INBOX — GET /api/messages
// Returns list of unique conversations (including all accepted connections)
// ══════════════════════════════════════════════════════════════
router.get('/', requireAuth, async (req, res) => {
    try {
        // 1. Get all ACCEPTED match requests
        const { data: requests, error: reqError } = await withTimeout(
            supabaseAdmin
                .from('match_requests')
                .select(`
                    id, updated_at, sender_id, receiver_id,
                    sender:profiles!match_requests_sender_id_fkey(member_id, full_name, profile_picture_url, is_managed, hide_photo),
                    receiver:profiles!match_requests_receiver_id_fkey(member_id, full_name, profile_picture_url, is_managed, hide_photo)
                `)
                .eq('status', 'accepted')
                .or(`sender_id.eq.${req.userId},receiver_id.eq.${req.userId}`),
            TIMEOUT_MS.QUERY,
            'getAcceptedRequests'
        );

        if (reqError) throw reqError;

        // 2. Get all messages involving this user
        const { data: messages, error: msgError } = await withTimeout(
            supabaseAdmin
                .from('messages')
                .select(`
                    id, content, is_read, created_at,
                    sender_id, receiver_id,
                    sender:profiles!messages_sender_id_fkey(member_id, full_name, profile_picture_url, is_managed, hide_photo),
                    receiver:profiles!messages_receiver_id_fkey(member_id, full_name, profile_picture_url, is_managed, hide_photo)
                `)
                .or(`sender_id.eq.${req.userId},receiver_id.eq.${req.userId}`)
                .order('created_at', { ascending: false }),
            TIMEOUT_MS.QUERY,
            'getInbox'
        );

        if (msgError) throw msgError;

        const conversations = {};

        // Populate conversations with ALL accepted requests first
        (requests || []).forEach(req2 => {
            const isReqSender = req2.sender_id === req.userId;
            const other = isReqSender ? req2.receiver : req2.sender;
            const otherId = isReqSender ? req2.receiver_id : req2.sender_id;

            // Skip managed profiles from inbox
            if (other?.is_managed) return;

            conversations[otherId] = {
                member_id: other?.member_id,
                name: other?.full_name,
                photo: other?.profile_picture_url,
                hide_photo: other?.hide_photo || false,
                last_message: 'Start a conversation',
                last_time: req2.updated_at,
                unread: 0
            };
        });

        // Overlay actual messages (updates last_message and unread count)
        (messages || []).forEach(msg => {
            const isSender = msg.sender_id === req.userId;
            const other = isSender ? msg.receiver : msg.sender;
            const otherId = isSender ? msg.receiver_id : msg.sender_id;

            // Skip managed profiles here too (failsafe)
            if (other?.is_managed) return;

            if (!conversations[otherId]) {
                // Failsafe in case a message exists without an accepted request
                conversations[otherId] = {
                    member_id: other?.member_id,
                    name: other?.full_name,
                    photo: other?.profile_picture_url,
                    hide_photo: other?.hide_photo || false,
                    last_message: msg.content,
                    last_time: msg.created_at,
                    unread: 0
                };
            } else if (conversations[otherId].last_message === 'Start a conversation') {
                // Update with the most recent actual message
                conversations[otherId].last_message = msg.content;
                conversations[otherId].last_time = msg.created_at;
            }

            // Increment unread if applicable
            if (!msg.is_read && msg.receiver_id === req.userId) {
                conversations[otherId].unread++;
            }
        });

        // Sort by last_time descending
        const sortedConversations = Object.values(conversations).sort((a, b) => {
            return new Date(b.last_time) - new Date(a.last_time);
        });

        res.json({ conversations: sortedConversations });
    } catch (err) {
        console.error('Inbox error:', err.message);
        res.status(500).json({ error: 'Failed to load messages' });
    }
});

// ══════════════════════════════════════════════════════════════
// GET MESSAGE THREAD — GET /api/messages/:member_id
// ══════════════════════════════════════════════════════════════
router.get('/:member_id', requireAuth, async (req, res) => {
    try {
        const { member_id } = req.params;

        // Get the other user's UUID
        const { data: other } = await withTimeout(
            supabaseAdmin
                .from('profiles')
                .select('id, full_name, profile_picture_url, plan_name, last_seen, is_manually_online, is_managed, hide_photo')
                .eq('member_id', member_id)
                .single(),
            TIMEOUT_MS.QUERY,
            'getOtherUserProfile'
        );

        if (!other) return res.status(404).json({ error: 'Profile not found' });

        const { data, error } = await withTimeout(
            supabaseAdmin
                .from('messages')
                .select('id, content, is_read, created_at, sender_id, receiver_id, is_edited, is_deleted, edited_at')
                .or(`and(sender_id.eq.${req.userId},receiver_id.eq.${other.id}),and(sender_id.eq.${other.id},receiver_id.eq.${req.userId})`)
                .order('created_at', { ascending: true }),
            TIMEOUT_MS.QUERY,
            'getMessageThread'
        );


        if (error) throw error;

        // Mark received messages as read
        await withTimeout(
            supabaseAdmin
                .from('messages')
                .update({ is_read: true })
                .eq('receiver_id', req.userId)
                .eq('sender_id', other.id),
            TIMEOUT_MS.QUERY,
            'markMessagesRead'
        );

        res.json({
            messages: data || [],
            recipient: {
                member_id,
                full_name: other.full_name,
                profile_picture_url: other.profile_picture_url,
                plan_name: other.plan_name,
                last_seen: other.last_seen,
                is_manually_online: other.is_manually_online,
                is_managed: other.is_managed,
                hide_photo: other.hide_photo || false
            },
            other_user: {
                member_id,
                name: other.full_name,
                photo: other.profile_picture_url
            }
        });
    } catch (err) {
        console.error('Thread error:', err.message);
        res.status(500).json({ error: 'Failed to load conversation' });
    }
});

// ══════════════════════════════════════════════════════════════
// SEND MESSAGE — POST /api/messages/send
// Plan-gated: Silver/Gold = 10/day, Diamond/VIP = unlimited, Free = blocked
// ══════════════════════════════════════════════════════════════
router.post('/send', requireAuth, async (req, res) => {
    try {
        const { to_member_id, content } = req.body;

        if (!to_member_id || !content?.trim()) {
            return res.status(400).json({ error: 'to_member_id and content are required' });
        }

        // ── 1. Plan gate ──────────────────────────────────
        const plan = await getUserPlan(req.userId);
        const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

        if (!limits.canMessage) {
            return res.status(403).json({
                error: `Your ${plan} plan does not include messaging. Upgrade to Silver or higher.`,
                upgrade_required: true
            });
        }

        // ── 2. Silver/Gold daily limit check ────────────────
        let today;
        if (plan === 'silver' || plan === 'gold') {
            const usage = await getDailyMessageCount(req.userId);
            today = usage.today;
            const maxAllowed = limits.limit;
            if (usage.count >= maxAllowed) {
                return res.status(429).json({
                    error: `You have reached your ${maxAllowed} messages/day limit for the ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan.`,
                    messages_used: usage.count,
                    limit: maxAllowed,
                    resets: 'tomorrow midnight'
                });
            }
        }

        // ── 3. Silver/Gold: block URLs ───────────────────
        if ((plan === 'silver' || plan === 'gold') && URL_REGEX.test(content)) {
            return res.status(400).json({
                error: 'Links are not allowed on Silver/Gold plans. Upgrade to Diamond to send URLs.'
            });
        }

        // ── 4. Get receiver UUID ──────────────────────────
        const { data: receiver } = await withTimeout(
            supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('member_id', to_member_id)
                .eq('is_blocked', false)
                .single(),
            TIMEOUT_MS.QUERY,
            'getReceiverProfile'
        );

        if (!receiver) return res.status(404).json({ error: 'Recipient not found' });

        // ── 5. Check accepted request exists ─────────────
        const { data: request } = await withTimeout(
            supabaseAdmin
                .from('match_requests')
                .select('id')
                .eq('status', 'accepted')
                .or(`and(sender_id.eq.${req.userId},receiver_id.eq.${receiver.id}),and(sender_id.eq.${receiver.id},receiver_id.eq.${req.userId})`)
                .single(),
            TIMEOUT_MS.QUERY,
            'getAcceptedRequest'
        );

        if (!request) {
            return res.status(403).json({
                error: 'You can only message accepted connections. Send an interest request first.'
            });
        }

        // ── 6. Insert message ─────────────────────────────
        const { data: message, error } = await withTimeout(
            supabaseAdmin
                .from('messages')
                .insert({
                    sender_id: req.userId,
                    receiver_id: receiver.id,
                    content: content.trim()
                })
                .select()
                .single(),
            TIMEOUT_MS.QUERY,
            'insertMessage'
        );

        if (error) throw error;

        // ── 7. Increment Silver/Gold daily usage counter ────────────
        if (plan === 'silver' || plan === 'gold') await incrementDailyMessageCount(req.userId, today);

        res.status(201).json({ message: 'Message sent', data: message });

    } catch (err) {
        console.error('Send message error:', err.message);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// ══════════════════════════════════════════════════════════════
// EDIT MESSAGE — PUT /api/messages/:id
// ══════════════════════════════════════════════════════════════
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;

        if (!content?.trim()) return res.status(400).json({ error: 'Content required' });

        // Update if sender
        const { data, error } = await withTimeout(
            supabaseAdmin
                .from('messages')
                .update({ 
                    content: content.trim(), 
                    is_edited: true, 
                    edited_at: new Date().toISOString() 
                })
                .eq('id', id)
                .eq('sender_id', req.userId)
                .select()
                .single(),
            TIMEOUT_MS.QUERY,
            'editMessage'
        );

        if (error) return res.status(403).json({ error: 'Unauthorized or not found' });
        res.json({ message: 'Message updated', data });
    } catch (err) {
        res.status(500).json({ error: 'Failed to edit message' });
    }
});

// ══════════════════════════════════════════════════════════════
// DELETE MESSAGE — DELETE /api/messages/:id
// Soft delete (sets is_deleted=true)
// ══════════════════════════════════════════════════════════════
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await withTimeout(
            supabaseAdmin
                .from('messages')
                .update({ 
                    is_deleted: true,
                    content: 'This message was deleted' 
                })
                .eq('id', id)
                .eq('sender_id', req.userId)
                .select()
                .single(),
            TIMEOUT_MS.QUERY,
            'deleteMessage'
        );

        if (error) return res.status(403).json({ error: 'Unauthorized or not found' });
        res.json({ message: 'Message deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

module.exports = router;
