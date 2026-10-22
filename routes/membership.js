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

const PLAN_FEATURES = {
    free:    { canMessage: false, canCall: false, messageLimit: 0,    contactViews: 0  },
    silver:  { canMessage: true,  canCall: false, messageLimit: 15,   contactViews: 15 },  // 15/day
    gold:    { canMessage: true,  canCall: false, messageLimit: 10,   contactViews: 30 },  // 10/day
    diamond: { canMessage: true,  canCall: true,  messageLimit: null, contactViews: 50 },
    vip:     { canMessage: true,  canCall: true,  messageLimit: null, contactViews: null }
};

// ══════════════════════════════════════════════════════════════
// GET MEMBERSHIP STATUS — GET /api/membership/status
// ══════════════════════════════════════════════════════════════
router.get('/status', requireAuth, async (req, res) => {
    try {
        const { data: profile } = await withTimeout(
            supabaseAdmin
                .from('profiles')
                .select('plan_name, plan_expiry_date, membership_status, last_payment_date, member_id')
                .eq('id', req.userId)
                .single(),
            TIMEOUT_MS.QUERY,
            'getMembershipStatus'
        );

        if (!profile) return res.status(404).json({ error: 'Profile not found' });

        let plan = profile.plan_name || 'free';

        // Auto-downgrade on expiry
        if (plan !== 'free' && profile.plan_expiry_date) {
            const expired = new Date(profile.plan_expiry_date) < new Date();
            if (expired) {
                plan = 'free';
                await withTimeout(
                    supabaseAdmin
                        .from('profiles')
                        .update({ plan_name: 'free', membership_status: 'expired' })
                        .eq('id', req.userId),
                    TIMEOUT_MS.QUERY,
                    'downgradeExpiredMembership'
                );
            }
        }

        // Get today's message count for Silver/Gold
        let messagesUsed = 0;
        let messagesLeft = null;
        if (plan === 'silver' || plan === 'gold') {
            const today = new Date().toISOString().split('T')[0];

            const { data: usage } = await withTimeout(
                supabaseAdmin
                    .from('plan_usage')
                    .select('message_count')
                    .eq('user_id', req.userId)
                    .eq('week_start', today)   // week_start column stores today's date
                    .single(),
                TIMEOUT_MS.QUERY,
                'getDailyMessageUsage'
            );

            messagesUsed = usage?.message_count || 0;
            messagesLeft = Math.max(0, 10 - messagesUsed);
        }

        const features = PLAN_FEATURES[plan] || PLAN_FEATURES.free;
        const contactStats = await limits.getContactViewStats(req.userId, plan);

        res.json({
            plan,
            membership_status: profile.membership_status,
            expiry_date: profile.plan_expiry_date,
            last_payment: profile.last_payment_date,
            member_id: profile.member_id,
            features: {
                ...features,
                messages_used_today: messagesUsed,
                messages_left_today: messagesLeft,
                contact_views_used: contactStats.used,
                contact_views_left: contactStats.remaining,
                contact_views_total: contactStats.total
            }
        });

    } catch (err) {
        console.error('Membership status error:', err.message);
        res.status(500).json({ error: 'Failed to get membership status' });
    }
});

// ══════════════════════════════════════════════════════════════
// CHECK FEATURE ACCESS — POST /api/membership/check
// body: { action: 'message' | 'call' | 'view_contact' }
// Returns { allowed: true/false, reason: '...' }
// ══════════════════════════════════════════════════════════════
router.post('/check', requireAuth, async (req, res) => {
    try {
        const { action } = req.body;
        if (!action) return res.status(400).json({ error: 'action required' });

        const { data: profile } = await withTimeout(
            supabaseAdmin
                .from('profiles')
                .select('plan_name, plan_expiry_date')
                .eq('id', req.userId)
                .single(),
            TIMEOUT_MS.QUERY,
            'getProfileForCheck'
        );

        let plan = profile?.plan_name || 'free';

        // Expiry check
        if (plan !== 'free' && profile?.plan_expiry_date) {
            if (new Date(profile.plan_expiry_date) < new Date()) plan = 'free';
        }

        const features = PLAN_FEATURES[plan] || PLAN_FEATURES.free;

        const results = {
            message: {
                allowed: features.canMessage,
                reason: features.canMessage
                    ? 'Messaging enabled'
                    : 'Messaging requires Gold plan or higher'
            },
            call: {
                allowed: features.canCall,
                reason: features.canCall ? 'Voice & video enabled' : 'Calls require Diamond plan or higher'
            },
            view_contact: {
                allowed: true, // All plans can view, but show upgrade CTA
                reason: `Contact view allowed on ${plan} plan`
            }
        };

        const result = results[action] || { allowed: false, reason: 'Unknown action' };
        res.json({ ...result, plan, upgrade_url: '/membership.html' });

    } catch (err) {
        console.error('Membership check error:', err.message);
        res.status(500).json({ error: 'Failed to check access' });
    }
});

module.exports = router;
