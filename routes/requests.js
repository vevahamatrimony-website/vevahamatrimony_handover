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

// ══════════════════════════════════════════════════════════════
// COMPATIBILITY SCORING ENGINE
// ══════════════════════════════════════════════════════════════
function calculateMatchScore(user, target) {
    if (!user || !target) return 0;
    let score = 0;
    const weights = { caste: 25, age: 20, religion: 15, location: 15, education: 15, mother_tongue: 10 };

    // 1. Caste
    if (user.preferred_caste === 'same-caste' && user.caste && target.caste === user.caste) score += weights.caste;
    else if (user.preferred_caste && target.caste && target.caste.toLowerCase().includes(user.preferred_caste.toLowerCase())) score += weights.caste;
    else if (user.preferred_caste === 'any-caste') score += weights.caste;

    // 2. Age
    const targetAge = target.date_of_birth ? Math.floor((Date.now() - new Date(target.date_of_birth)) / 31557600000) : null;
    if (targetAge && user.preferred_age_from && user.preferred_age_to) {
        const from = parseInt(user.preferred_age_from);
        const to = parseInt(user.preferred_age_to);
        if (targetAge >= from && targetAge <= to) score += weights.age;
        else if (Math.abs(targetAge - from) <= 2 || Math.abs(targetAge - to) <= 2) score += 10;
    }

    // 3. Religion
    if (target.religion && user.religion && target.religion.toLowerCase().includes(user.religion.toLowerCase())) score += weights.religion;

    // 4. Location
    if (target.city && user.city && target.city.toLowerCase() === user.city.toLowerCase()) score += weights.location;
    else if (target.state && user.state && target.state.toLowerCase() === user.state.toLowerCase()) score += 10;

    // 5. Education
    if (target.education && user.preferred_education) {
        if (target.education.toLowerCase().includes(user.preferred_education.toLowerCase()) || user.preferred_education === 'any-education') score += weights.education;
    }

    // 6. Mother Tongue
    if (target.mother_tongue && user.mother_tongue && target.mother_tongue.toLowerCase() === user.mother_tongue.toLowerCase()) score += weights.mother_tongue;

    return Math.min(score, 100);
}

// Helper to fetch and normalize offline member profiles
async function getOfflineProfilesByIds(memberIds) {
    if (!memberIds || memberIds.length === 0) return new Map();
    const cleanIds = memberIds.map(id => String(id).replace(/^offline_/, ''));
    try {
        const { data, error } = await withTimeout(
            supabaseAdmin
                .from('offline_members')
                .select('*')
                .in('member_id', cleanIds),
            TIMEOUT_MS.QUERY,
            'getOfflineProfilesByIds'
        );
        const map = new Map();
        if (!error && data) {
            data.forEach(o => {
                let age = null;
                if (o.dob) {
                    const parsedDate = new Date(o.dob);
                    if (!isNaN(parsedDate.getTime())) {
                        age = Math.floor((Date.now() - parsedDate.getTime()) / 31557600000);
                    }
                }
                if (!age && o.age) {
                    const parsed = parseInt(o.age);
                    if (!isNaN(parsed)) age = parsed;
                }
                const norm = {
                    id: `offline_${o.member_id}`,
                    member_id: o.member_id,
                    full_name: o.full_name || 'Member ' + o.member_id,
                    gender: o.gender,
                    date_of_birth: o.dob,
                    age,
                    city: o.city || o.birth_place || o.address || '',
                    state: '',
                    education: o.education || '',
                    job_roles: o.job || '',
                    caste: o.caste || '',
                    religion: 'Hindu',
                    profile_picture_url: o.profile_picture_url || '/images/placeholder-profile.svg',
                    plan_name: 'free',
                    is_managed: true,
                    phone: o.phone || '',
                    whatsapp: o.whatsapp || '',
                    mobile_number: [o.phone, o.whatsapp].filter(Boolean).join(', ') || null
                };
                map.set(o.member_id, norm);
                map.set(`offline_${o.member_id}`, norm);
            });
        }
        return map;
    } catch (e) {
        console.warn('getOfflineProfilesByIds error:', e.message);
        return new Map();
    }
}

// ══════════════════════════════════════════════════════════════
// SEND REQUEST — POST /api/requests/send
// ══════════════════════════════════════════════════════════════
router.post('/send', requireAuth, async (req, res) => {
    try {
        const { receiver_id, status = 'pending' } = req.body;
        const sender_id = req.userId;

        if (!receiver_id) return res.status(400).json({ error: 'Receiver ID required' });
        if (sender_id === receiver_id) return res.status(400).json({ error: 'Cannot send request to yourself' });

        // Check sender plan: Free tier accounts cannot send interest requests
        const { data: sender } = await supabaseAdmin
            .from('profiles')
            .select('plan_name, gender')
            .eq('id', sender_id)
            .single();
        const planName = (sender?.plan_name || 'free').toLowerCase();

        if (status !== 'declined' && planName === 'free') {
            return res.status(403).json({ 
                error: 'UPGRADE_REQUIRED',
                message: 'Upgrade required to send interest requests. Please upgrade your plan to connect with members.' 
            });
        }

        if (receiver_id.toString().startsWith('offline_')) {
            // Sending interest to an offline (managed) member is automatically accepted
            const finalStatus = status === 'declined' ? 'declined' : 'accepted';

            // Check if already exists
            const { data: existing } = await withTimeout(
                supabaseAdmin
                    .from('offline_interests')
                    .select('id, status')
                    .eq('sender_id', sender_id)
                    .eq('offline_member_id', receiver_id)
                    .maybeSingle(),
                TIMEOUT_MS.QUERY,
                'checkOfflineExisting'
            );

            if (existing) {
                if (existing.status !== finalStatus) {
                    const { data: updatedOffline, error: updateOfflineErr } = await withTimeout(
                        supabaseAdmin
                            .from('offline_interests')
                            .update({ status: finalStatus, updated_at: new Date().toISOString() })
                            .eq('id', existing.id)
                            .select()
                            .single(),
                        TIMEOUT_MS.QUERY,
                        'updateOfflineInterest'
                    );
                    if (updateOfflineErr) throw updateOfflineErr;
                    return res.json({
                        message: 'Offline interest updated',
                        request: { receiver_id, status: finalStatus }
                    });
                }
                return res.json({
                    message: finalStatus === 'declined' ? 'Profile declined' : 'Interest already shown',
                    request: { receiver_id, status: existing.status }
                });
            }

            const { data: offlineData, error: offlineErr } = await withTimeout(
                supabaseAdmin
                    .from('offline_interests')
                    .insert([{ sender_id, offline_member_id: receiver_id, status: finalStatus }])
                    .select()
                    .single(),
                TIMEOUT_MS.QUERY,
                'insertOfflineInterest'
            );
            if (offlineErr) throw offlineErr;

            return res.json({
                message: finalStatus === 'declined' ? 'Profile declined' : 'Interest shown in managed profile',
                request: { receiver_id, status: finalStatus }
            });
        }

        // Check if request already exists
        const { data: existing, error: findErr } = await withTimeout(
            supabaseAdmin
                .from('match_requests')
                .select('*')
                .or(`and(sender_id.eq.${sender_id},receiver_id.eq.${receiver_id}),and(sender_id.eq.${receiver_id},receiver_id.eq.${sender_id})`)
                .maybeSingle(),
            TIMEOUT_MS.QUERY,
            'checkExistingRequest'
        );

        if (existing) {
            if (existing.status === 'pending') {
                return res.status(400).json({ error: 'A pending request already exists between you two' });
            } else if (existing.status === 'accepted') {
                return res.status(400).json({ error: 'You are already connected' });
            }
            if (existing.status === 'declined') {
                if (existing.status !== finalStatus) {
                    const { data: updatedReq, error: updateErr } = await withTimeout(
                        supabaseAdmin
                            .from('match_requests')
                            .update({
                                status: finalStatus,
                                sender_id: sender_id,
                                receiver_id: receiver_id,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', existing.id)
                            .select()
                            .single(),
                        TIMEOUT_MS.QUERY,
                        'updateDeclinedRequest'
                    );
                    if (updateErr) throw updateErr;
                    return res.json({ message: 'Request updated successfully', request: updatedReq });
                } else {
                    return res.json({ message: 'Request was already declined', request: existing });
                }
            }
            return res.status(400).json({ error: `Request was previously ${existing.status}` });
        }

        // Check if receiver is a managed profile (auto-accept)
        let finalStatus = status;
        const { data: receiverProfile } = await withTimeout(
            supabaseAdmin
                .from('profiles')
                .select('is_managed')
                .eq('id', receiver_id)
                .maybeSingle(),
            TIMEOUT_MS.QUERY,
            'checkManagedStatus'
        );
        if (receiverProfile?.is_managed) {
            finalStatus = 'accepted';
        }

        // Create new request
        const { data, error } = await withTimeout(
            supabaseAdmin
                .from('match_requests')
                .insert([{ sender_id, receiver_id, status: finalStatus }])
                .select()
                .single(),
            TIMEOUT_MS.QUERY,
            'sendRequest'
        );

        if (error) throw error;
        res.json({ message: 'Request sent successfully', request: data });
    } catch (err) {
        console.error('Send request error:', err);
        res.status(500).json({ error: 'Failed to send request', details: err.message || JSON.stringify(err) });
    }
});

// ══════════════════════════════════════════════════════════════
// ACCEPT REQUEST — POST /api/requests/accept
// ══════════════════════════════════════════════════════════════
router.post('/accept', requireAuth, async (req, res) => {
    try {
        const { request_id } = req.body;
        if (!request_id) return res.status(400).json({ error: 'Request ID required' });

        // Check receiver's plan: Free tier accounts cannot accept requests without a plan
        const { data: receiverProfile } = await supabaseAdmin
            .from('profiles')
            .select('plan_name')
            .eq('id', req.userId)
            .single();
        const receiverPlan = (receiverProfile?.plan_name || 'free').toLowerCase();

        if (receiverPlan === 'free') {
            return res.status(403).json({
                error: 'UPGRADE_REQUIRED',
                message: 'Upgrade required to accept connection requests. Please upgrade your plan to connect.'
            });
        }

        const { data, error } = await withTimeout(
            supabaseAdmin
                .from('match_requests')
                .update({ status: 'accepted' })
                .eq('id', request_id)
                .eq('receiver_id', req.userId)
                .select()
                .single(),
            TIMEOUT_MS.QUERY,
            'acceptRequest'
        );

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Request not found or unauthorized' });

        res.json({ message: 'Request accepted', request: data });
    } catch (err) {
        console.error('Accept request error:', err);
        res.status(500).json({ error: 'Failed to accept request' });
    }
});

// ══════════════════════════════════════════════════════════════
// DECLINE REQUEST — POST /api/requests/decline
// ══════════════════════════════════════════════════════════════
router.post('/decline', requireAuth, async (req, res) => {
    try {
        const { request_id } = req.body;
        if (!request_id) return res.status(400).json({ error: 'Request ID required' });

        const { data, error } = await withTimeout(
            supabaseAdmin
                .from('match_requests')
                .update({ status: 'declined' })
                .eq('id', request_id)
                .eq('receiver_id', req.userId)
                .select()
                .single(),
            TIMEOUT_MS.QUERY,
            'declineRequest'
        );

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Request not found or unauthorized' });

        res.json({ message: 'Request declined' });
    } catch (err) {
        console.error('Decline request error:', err);
        res.status(500).json({ error: 'Failed to decline request' });
    }
});

// ══════════════════════════════════════════════════════════════
// GET PENDING RECEIVED REQUESTS — GET /api/requests/pending
// ══════════════════════════════════════════════════════════════
router.get('/pending', requireAuth, async (req, res) => {
    try {
        const { data: requests, error } = await withTimeout(
            supabaseAdmin
                .from('match_requests')
                .select('*')
                .eq('receiver_id', req.userId)
                .eq('status', 'pending'),
            TIMEOUT_MS.QUERY,
            'getPendingRequests'
        );

        if (error) throw error;
        if (!requests || requests.length === 0) return res.json({ requests: [] });

        const senderIds = requests.map(r => r.sender_id);
        const { data: senders, error: profErr } = await withTimeout(
            supabaseAdmin
                .from('profiles')
                .select('id, member_id, full_name, profile_picture_url, date_of_birth, city, hide_photo')
                .in('id', senderIds),
            TIMEOUT_MS.QUERY,
            'getSenderProfiles'
        );

        if (profErr) throw profErr;

        const result = requests.map(r => {
            const sender = (senders || []).find(s => s.id === r.sender_id) || null;
            if (sender && sender.date_of_birth) {
                sender.age = Math.floor((Date.now() - new Date(sender.date_of_birth)) / (31557600000));
            }
            return { ...r, sender };
        });

        res.json({ requests: result });
    } catch (err) {
        console.error('Get pending requests error:', err);
        res.status(500).json({ error: 'Failed to fetch pending requests' });
    }
});

// ══════════════════════════════════════════════════════════════
// GET DECLINED REQUESTS — GET /api/requests/declined
// ══════════════════════════════════════════════════════════════
router.get('/declined', requireAuth, async (req, res) => {
    try {
        const userId = req.userId;
        const { data: requests, error } = await withTimeout(
            supabaseAdmin
                .from('match_requests')
                .select('*')
                .eq('status', 'declined')
                .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`),
            TIMEOUT_MS.QUERY,
            'getDeclinedRequests'
        );

        if (error) throw error;

        // Also fetch declined offline interests
        const { data: offlineDeclined } = await withTimeout(
            supabaseAdmin
                .from('offline_interests')
                .select('id, sender_id, offline_member_id, status, created_at')
                .eq('sender_id', userId)
                .eq('status', 'declined'),
            TIMEOUT_MS.QUERY,
            'getDeclinedOfflineInterests'
        );

        const otherIds = (requests || []).map(r => r.sender_id === userId ? r.receiver_id : r.sender_id);
        let profiles = [];
        if (otherIds.length > 0) {
            const { data, error: profErr } = await withTimeout(
                supabaseAdmin
                    .from('profiles')
                    .select('id, member_id, full_name, profile_picture_url, date_of_birth, city, state, religion, caste, education, job_roles, plan_name, hide_photo')
                    .in('id', otherIds),
                TIMEOUT_MS.QUERY,
                'getDeclinedOtherProfiles'
            );
            if (profErr) throw profErr;
            profiles = data || [];
        }

        const regularResult = (requests || []).map(r => {
            const otherUser = profiles.find(p => p.id === (r.sender_id === userId ? r.receiver_id : r.sender_id)) || null;
            if (otherUser && otherUser.date_of_birth) {
                otherUser.age = Math.floor((Date.now() - new Date(otherUser.date_of_birth)) / 31557600000);
            }
            return {
                ...r,
                other_user: otherUser,
                type: r.sender_id === userId ? 'sent' : 'received'
            };
        });

        let offlineResult = [];
        if (offlineDeclined && offlineDeclined.length > 0) {
            const offlineMap = await getOfflineProfilesByIds(offlineDeclined.map(o => o.offline_member_id));
            offlineResult = offlineDeclined.map(o => ({
                id: o.id,
                sender_id: o.sender_id,
                receiver_id: o.offline_member_id,
                status: 'declined',
                created_at: o.created_at,
                other_user: offlineMap.get(o.offline_member_id) || null,
                type: 'sent'
            }));
        }

        res.json({ requests: [...regularResult, ...offlineResult] });
    } catch (err) {
        console.error('Get declined requests error:', err);
        res.status(500).json({ error: 'Failed to fetch declined requests' });
    }
});

// ══════════════════════════════════════════════════════════════
// GET SENT REQUESTS — GET /api/requests/sent
// ══════════════════════════════════════════════════════════════
router.get('/sent', requireAuth, async (req, res) => {
    try {
        const { data: requests, error } = await withTimeout(
            supabaseAdmin
                .from('match_requests')
                .select('*')
                .eq('sender_id', req.userId),
            TIMEOUT_MS.QUERY,
            'getSentRequests'
        );
        if (error) throw error;

        // Also fetch offline interests
        const { data: offlineRequests, error: oiErr } = await withTimeout(
            supabaseAdmin
                .from('offline_interests')
                .select('id, sender_id, offline_member_id, status, created_at')
                .eq('sender_id', req.userId),
            TIMEOUT_MS.QUERY,
            'getSentOfflineInterests'
        );
        if (oiErr) throw oiErr;

        const { data: userProfile } = await supabaseAdmin.from('profiles').select('*').eq('id', req.userId).single();

        const receiverIds = (requests || []).map(r => r.receiver_id);
        const dbReceiverIds = receiverIds.filter(id =>
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
        );

        let receivers = [];
        if (dbReceiverIds.length > 0) {
            const { data, error: profErr } = await withTimeout(
                supabaseAdmin
                    .from('profiles')
                    .select('id, member_id, full_name, profile_picture_url, date_of_birth, city, state, religion, caste, education, job_roles, plan_name, hide_photo')
                    .in('id', dbReceiverIds),
                TIMEOUT_MS.QUERY,
                'getReceiverProfiles'
            );
            if (profErr) throw profErr;
            receivers = data || [];
        }

        const regularResult = (requests || []).map(r => {
            const receiver = receivers.find(s => s.id === r.receiver_id) || null;
            if (receiver) {
                receiver.age = receiver.date_of_birth ? Math.floor((Date.now() - new Date(receiver.date_of_birth)) / 31557600000) : null;
                receiver.match_percentage = calculateMatchScore(userProfile, receiver);
            }
            return { ...r, receiver };
        });

        // Fetch and normalize offline member profiles for receiver object
        let offlineResult = [];
        if (offlineRequests && offlineRequests.length > 0) {
            const offlineMap = await getOfflineProfilesByIds(offlineRequests.map(r => r.offline_member_id));
            offlineResult = offlineRequests.map(r => {
                const receiver = offlineMap.get(r.offline_member_id) || {
                    id: r.offline_member_id,
                    member_id: r.offline_member_id.replace(/^offline_/, ''),
                    full_name: 'Member ' + r.offline_member_id.replace(/^offline_/, ''),
                    city: '',
                    education: '',
                    plan_name: 'free',
                    is_managed: true
                };
                return {
                    id: r.id,
                    sender_id: r.sender_id,
                    receiver_id: r.offline_member_id,
                    status: r.status,
                    created_at: r.created_at,
                    receiver
                };
            });
        }

        res.json({ requests: [...regularResult, ...offlineResult] });
    } catch (err) {
        console.error('Get sent requests error:', err);
        res.status(500).json({ error: 'Failed to fetch sent requests' });
    }
});

// ══════════════════════════════════════════════════════════════
// CANCEL SENT REQUEST — POST /api/requests/cancel
// ══════════════════════════════════════════════════════════════
router.post('/cancel', requireAuth, async (req, res) => {
    try {
        const { request_id } = req.body;
        if (!request_id) return res.status(400).json({ error: 'Request ID required' });

        // Verify the request belongs to this user and is still pending
        const { data: existing, error: findErr } = await withTimeout(
            supabaseAdmin
                .from('match_requests')
                .select('id, sender_id, status')
                .eq('id', request_id)
                .eq('sender_id', req.userId)
                .single(),
            TIMEOUT_MS.QUERY,
            'findRequestForCancel'
        );

        if (findErr || !existing) {
            return res.status(404).json({ error: 'Request not found or not yours to cancel' });
        }
        if (existing.status !== 'pending') {
            return res.status(400).json({ error: `Cannot cancel a request that is already ${existing.status}` });
        }

        const { error: delErr } = await withTimeout(
            supabaseAdmin
                .from('match_requests')
                .delete()
                .eq('id', request_id)
                .eq('sender_id', req.userId),
            TIMEOUT_MS.QUERY,
            'cancelRequest'
        );

        if (delErr) throw delErr;
        res.json({ message: 'Request cancelled successfully' });
    } catch (err) {
        console.error('Cancel request error:', err);
        res.status(500).json({ error: 'Failed to cancel request' });
    }
});

// ══════════════════════════════════════════════════════════════
// UPDATE OFFLINE INTEREST STATUS — POST /api/requests/update-offline
// ══════════════════════════════════════════════════════════════
router.post('/update-offline', requireAuth, async (req, res) => {
    try {
        const { offline_member_id, status } = req.body;
        if (!offline_member_id || !status) return res.status(400).json({ error: 'offline_member_id and status required' });

        const rawId = String(offline_member_id).replace(/^offline_/, '');
        const withPrefix = `offline_${rawId}`;

        const { error } = await withTimeout(
            supabaseAdmin
                .from('offline_interests')
                .update({ status, updated_at: new Date().toISOString() })
                .eq('sender_id', req.userId)
                .or(`offline_member_id.eq.${withPrefix},offline_member_id.eq.${rawId}`),
            TIMEOUT_MS.QUERY,
            'updateOfflineInterest'
        );
        if (error) throw error;
        res.json({ message: 'Status updated' });
    } catch (err) {
        console.error('Update offline interest error:', err);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

// ══════════════════════════════════════════════════════════════
// REMOVE OFFLINE INTEREST — POST /api/requests/remove-offline
// ══════════════════════════════════════════════════════════════
router.post('/remove-offline', requireAuth, async (req, res) => {
    try {
        const { offline_member_id } = req.body;
        if (!offline_member_id) return res.status(400).json({ error: 'offline_member_id required' });

        const rawId = String(offline_member_id).replace(/^offline_/, '');
        const withPrefix = `offline_${rawId}`;

        const { error } = await withTimeout(
            supabaseAdmin
                .from('offline_interests')
                .delete()
                .eq('sender_id', req.userId)
                .or(`offline_member_id.eq.${withPrefix},offline_member_id.eq.${rawId}`),
            TIMEOUT_MS.QUERY,
            'removeOfflineInterest'
        );
        if (error) throw error;
        res.json({ message: 'Removed successfully' });
    } catch (err) {
        console.error('Remove offline interest error:', err);
        res.status(500).json({ error: 'Failed to remove' });
    }
});

router.get('/debug', requireAuth, async (req, res) => {
    try {
        const { data: userSent } = await supabaseAdmin.from('match_requests').select('id', { count: 'exact' }).eq('sender_id', req.userId);
        const { data: userRecv } = await supabaseAdmin.from('match_requests').select('id', { count: 'exact' }).eq('receiver_id', req.userId);
        const { count: totalGlobal } = await supabaseAdmin.from('match_requests').select('id', { count: 'exact', head: true });
        const { data: myProfile } = await supabaseAdmin.from('profiles').select('id, member_id').eq('id', req.userId).single();

        res.json({
            auth_id: req.userId,
            profile: myProfile || 'NOT FOUND',
            counts: {
                sent: userSent ? userSent.length : 0,
                received: userRecv ? userRecv.length : 0,
                global_total: totalGlobal
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ══════════════════════════════════════════════════════════════
// GET ACCEPTED CONNECTIONS — GET /api/requests/connections
// ══════════════════════════════════════════════════════════════
router.get('/connections', requireAuth, async (req, res) => {
    try {
        const { data: connections, error } = await withTimeout(
            supabaseAdmin
                .from('match_requests')
                .select('*')
                .eq('status', 'accepted')
                .or(`sender_id.eq.${req.userId},receiver_id.eq.${req.userId}`),
            TIMEOUT_MS.QUERY,
            'getConnections'
        );

        if (error) throw error;

        // Also fetch accepted offline interests
        const { data: offlineAccepted } = await withTimeout(
            supabaseAdmin
                .from('offline_interests')
                .select('id, sender_id, offline_member_id, status, created_at')
                .eq('sender_id', req.userId)
                .eq('status', 'accepted'),
            TIMEOUT_MS.QUERY,
            'getAcceptedOfflineInterests'
        );

        const otherUserIds = (connections || []).map(c => c.sender_id === req.userId ? c.receiver_id : c.sender_id);
        let profiles = [];
        if (otherUserIds.length > 0) {
            const { data, error: profErr } = await withTimeout(
                supabaseAdmin
                    .from('profiles')
                    .select('id, member_id, full_name, profile_picture_url, date_of_birth, city, education, last_seen, is_manually_online, is_managed, hide_photo, mobile_number')
                    .in('id', otherUserIds),
                TIMEOUT_MS.QUERY,
                'getConnectionProfiles'
            );
            if (profErr) throw profErr;
            profiles = data || [];
        }

        const regularResult = (connections || []).map(r => {
            const otherId = r.sender_id === req.userId ? r.receiver_id : r.sender_id;
            const user = profiles.find(p => p.id === otherId) || null;
            if (user && user.date_of_birth) {
                user.age = Math.floor((Date.now() - new Date(user.date_of_birth)) / 31557600000);
            }
            return { ...r, user };
        });

        let offlineResult = [];
        if (offlineAccepted && offlineAccepted.length > 0) {
            const offlineMap = await getOfflineProfilesByIds(offlineAccepted.map(o => o.offline_member_id));
            offlineResult = offlineAccepted.map(o => ({
                id: o.id,
                sender_id: o.sender_id,
                receiver_id: o.offline_member_id,
                status: 'accepted',
                created_at: o.created_at,
                user: offlineMap.get(o.offline_member_id) || null
            }));
        }

        res.json({ connections: [...regularResult, ...offlineResult] });
    } catch (err) {
        console.error('Get connections error:', err);
        res.status(500).json({ error: 'Failed to fetch connections' });
    }
});

// ══════════════════════════════════════════════════════════════
// GET CONTACT INFO — GET /api/requests/contact/:member_id
// ══════════════════════════════════════════════════════════════
router.get('/contact/:member_id', requireAuth, async (req, res) => {
    try {
        const { member_id } = req.params;
        const cleanId = String(member_id).replace(/^offline_/, '');

        // 1. Check offline members
        const { data: offlineUser } = await supabaseAdmin
            .from('offline_members')
            .select('phone, whatsapp')
            .eq('member_id', cleanId)
            .maybeSingle();

        if (offlineUser) {
            const numbers = [offlineUser.phone, offlineUser.whatsapp].filter(Boolean).join(', ');
            return res.json({
                mobile_number: numbers,
                phone: offlineUser.phone || '',
                whatsapp: offlineUser.whatsapp || '',
                is_managed: true
            });
        }

        // 2. Check regular profiles
        const { data: targetUser } = await supabaseAdmin.from('profiles').select('id, mobile_number, is_managed').eq('member_id', member_id).maybeSingle();
        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        const { data: connection } = await supabaseAdmin
            .from('match_requests')
            .select('id')
            .eq('status', 'accepted')
            .or(`and(sender_id.eq.${req.userId},receiver_id.eq.${targetUser.id}),and(sender_id.eq.${targetUser.id},receiver_id.eq.${req.userId})`)
            .maybeSingle();

        if (!connection && !targetUser.is_managed) return res.status(403).json({ error: 'Unauthorized contact access' });
        res.json({ mobile_number: targetUser.mobile_number, is_managed: targetUser.is_managed });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch contact' });
    }
});

module.exports = router;
