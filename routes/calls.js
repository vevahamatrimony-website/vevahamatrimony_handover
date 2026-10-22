const router = require('express').Router();
const { supabaseAdmin } = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

const TIMEOUT_MS = {
    QUERY: 15000,
};

function withTimeout(promise, timeoutMs, operation) {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`${operation} timeout (${timeoutMs}ms)`)), timeoutMs)
        )
    ]);
}

// ══════════════════════════════════════════════════════════════
// IN-MEMORY CALL STATE STORE
// ══════════════════════════════════════════════════════════════
const activeCallsMap = new Map();
const CALL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes - auto cleanup

// Auto-cleanup expired calls every 30 seconds
setInterval(() => {
    const now = Date.now();
    for (const [callId, callData] of activeCallsMap.entries()) {
        if (now - callData.created_at > CALL_TIMEOUT_MS) {
            console.log(`🧹 Auto-cleanup expired call: ${callId}`);
            activeCallsMap.delete(callId);
        }
    }
}, 30000);

// ══════════════════════════════════════════════════════════════
// INITIATE CALL — POST /api/calls/initiate
// ══════════════════════════════════════════════════════════════
router.post('/initiate', requireAuth, async (req, res) => {
    try {
        const { receiver_id, call_type } = req.body; // call_type: 'audio' or 'video'

        if (!receiver_id || !['audio', 'video'].includes(call_type)) {
            return res.status(400).json({ error: 'receiver_id and call_type (audio/video) required' });
        }

        // Get caller info
        const { data: caller } = await withTimeout(
            supabaseAdmin
                .from('profiles')
                .select('id, member_id, full_name, plan_name')
                .eq('id', req.userId)
                .single(),
            TIMEOUT_MS.QUERY,
            'getCallerProfile'
        );

        if (!caller) return res.status(404).json({ error: 'Caller profile not found' });

        // Check if caller is Diamond/VIP
        const callerPlan = (caller.plan_name || 'free').toLowerCase();
        if (!['diamond', 'vip'].includes(callerPlan)) {
            return res.status(403).json({ error: 'Calls only available for Diamond/VIP members' });
        }

        // Get receiver info
        const { data: receiver } = await withTimeout(
            supabaseAdmin
                .from('profiles')
                .select('id, member_id, full_name, last_seen, is_manually_online')
                .eq('member_id', receiver_id)
                .single(),
            TIMEOUT_MS.QUERY,
            'getReceiverProfile'
        );

        if (!receiver) return res.status(404).json({ error: 'Receiver not found' });

        // Check if users have accepted connection
        const { data: connection } = await withTimeout(
            supabaseAdmin
                .from('match_requests')
                .select('id')
                .eq('status', 'accepted')
                .or(`and(sender_id.eq.${caller.id},receiver_id.eq.${receiver.id}),and(sender_id.eq.${receiver.id},receiver_id.eq.${caller.id})`)
                .single(),
            TIMEOUT_MS.QUERY,
            'checkConnection'
        );

        if (!connection) {
            return res.status(403).json({ error: 'You can only call users you have accepted connections with' });
        }

        // Create unique call_id
        const call_id = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Store call in memory
        activeCallsMap.set(call_id, {
            call_id,
            caller_id: caller.id,
            caller_member_id: caller.member_id,
            receiver_id: receiver.id,
            receiver_member_id: receiver.member_id,
            type: call_type,
            status: 'ringing',
            created_at: Date.now(),
            sdp_offer: null,
            sdp_answer: null,
            candidates: []
        });

        console.log(`📞 Call initiated: ${call_id} (${caller.member_id} → ${receiver.member_id})`);

        // Send success response
        res.json({
            ok: true,
            call_id: call_id,
            caller_id: caller.member_id,
            caller_name: caller.full_name,
            receiver_name: receiver.full_name,
            receiver_id: receiver.member_id,
            receiver_uuid: receiver.id,
            receiver_last_seen: receiver.last_seen,
            receiver_is_manually_online: receiver.is_manually_online,
            call_type: call_type
        });
    } catch (err) {
        console.error('Call initiate error:', err);
        res.status(500).json({ error: err.message || 'Failed to initiate call' });
    }
});

// ══════════════════════════════════════════════════════════════
// SIGNAL EXCHANGE — POST /api/calls/signal
// Exchange WebRTC SDP offers/answers and ICE candidates
// ══════════════════════════════════════════════════════════════
router.post('/signal', requireAuth, async (req, res) => {
    try {
        const { call_id, offer, answer, candidates } = req.body;

        if (!call_id) {
            return res.status(400).json({ error: 'call_id required' });
        }

        const callData = activeCallsMap.get(call_id);
        if (!callData) {
            return res.status(404).json({ error: 'Call not found or expired' });
        }

        // Store SDP offer if provided
        if (offer) {
            callData.sdp_offer = offer;
            console.log(`📤 Offer received for call: ${call_id}`);
        }

        // Store SDP answer if provided
        if (answer) {
            callData.sdp_answer = answer;
            callData.status = 'connected';
            console.log(`📥 Answer received for call: ${call_id}`);
        }

        // Store ICE candidates if provided
        if (candidates && Array.isArray(candidates)) {
            callData.candidates.push(...candidates);
            console.log(`🧊 ${candidates.length} ICE candidates received for call: ${call_id}`);
        }

        // Return current state for polling peer
        res.json({
            ok: true,
            call_id,
            status: callData.status,
            offer: callData.sdp_offer,
            answer: callData.sdp_answer,
            candidates: callData.candidates
        });
    } catch (err) {
        console.error('Signal error:', err);
        res.status(500).json({ error: err.message || 'Failed to exchange signals' });
    }
});

// ══════════════════════════════════════════════════════════════
// GET SIGNAL STATE — GET /api/calls/signal/:call_id
// Poll for current SDP/candidates
// ══════════════════════════════════════════════════════════════
router.get('/signal/:call_id', requireAuth, async (req, res) => {
    try {
        const { call_id } = req.params;

        const callData = activeCallsMap.get(call_id);
        if (!callData) {
            return res.status(404).json({ error: 'Call not found or expired' });
        }

        // Return current signaling state (polling from peer)
        res.json({
            ok: true,
            call_id,
            status: callData.status,
            offer: callData.sdp_offer,
            answer: callData.sdp_answer,
            candidates: callData.candidates
        });
    } catch (err) {
        console.error('Get signal error:', err);
        res.status(500).json({ error: err.message || 'Failed to get signal state' });
    }
});

// ══════════════════════════════════════════════════════════════
// ANSWER CALL — POST /api/calls/answer
// ══════════════════════════════════════════════════════════════
router.post('/answer', requireAuth, async (req, res) => {
    try {
        const { call_id } = req.body;
        if (!call_id) return res.status(400).json({ error: 'call_id required' });

        const callData = activeCallsMap.get(call_id);
        if (!callData) {
            return res.status(404).json({ error: 'Call not found or expired' });
        }

        callData.status = 'answering';
        console.log(`👍 Call answered: ${call_id}`);

        res.json({ ok: true, message: 'Call answered' });
    } catch (err) {
        console.error('Answer call error:', err.message);
        res.status(500).json({ error: 'Failed to answer call' });
    }
});

// ══════════════════════════════════════════════════════════════
// REJECT CALL — POST /api/calls/reject
// ══════════════════════════════════════════════════════════════
router.post('/reject', requireAuth, async (req, res) => {
    try {
        const { call_id } = req.body;
        if (!call_id) return res.status(400).json({ error: 'call_id required' });

        const callData = activeCallsMap.get(call_id);
        if (callData) {
            callData.status = 'rejected';
            console.log(`❌ Call rejected: ${call_id}`);
            // Clean up after a short delay to allow peer to detect rejection
            setTimeout(() => activeCallsMap.delete(call_id), 5000);
        }

        res.json({ ok: true, message: 'Call rejected' });
    } catch (err) {
        console.error('Reject call error:', err.message);
        res.status(500).json({ error: 'Failed to reject call' });
    }
});

// ══════════════════════════════════════════════════════════════
// END CALL — POST /api/calls/end
// ══════════════════════════════════════════════════════════════
router.post('/end', requireAuth, async (req, res) => {
    try {
        const { call_id } = req.body;
        if (!call_id) return res.status(400).json({ error: 'call_id required' });

        const callData = activeCallsMap.get(call_id);
        if (callData) {
            callData.status = 'ended';
            console.log(`📵 Call ended: ${call_id}`);
            // Clean up
            activeCallsMap.delete(call_id);
        }

        res.json({ ok: true, message: 'Call ended' });
    } catch (err) {
        console.error('End call error:', err.message);
        res.status(500).json({ error: 'Failed to end call' });
    }
});

// ══════════════════════════════════════════════════════════════
// GET INCOMING CALLS — GET /api/calls/incoming
// Return all incoming (ringing/answering) calls for user
// ══════════════════════════════════════════════════════════════
router.get('/incoming', requireAuth, async (req, res) => {
    try {
        const userId = req.userId;

        // Find all incoming calls for this user
        const incomingCalls = [];
        for (const [callId, callData] of activeCallsMap.entries()) {
            // Check if user is receiver and call is ringing
            if (callData.receiver_id === userId && ['ringing', 'answering'].includes(callData.status)) {
                incomingCalls.push({
                    call_id: callId,
                    caller_id: callData.caller_member_id,
                    caller_name: callData.caller_name || 'Unknown',
                    type: callData.type,
                    status: callData.status,
                    created_at: callData.created_at
                });
            }
        }

        console.log(`📱 Incoming calls for ${userId}: ${incomingCalls.length}`);
        res.json({ ok: true, calls: incomingCalls });
    } catch (err) {
        console.error('/incoming error:', err.message);
        res.status(500).json({ error: 'Failed to fetch calls' });
    }
});

// ══════════════════════════════════════════════════════════════
// GET CALL STATUS — GET /api/calls/:call_id/status
// ══════════════════════════════════════════════════════════════
router.get('/:call_id/status', requireAuth, async (req, res) => {
    try {
        const { call_id } = req.params;

        const callData = activeCallsMap.get(call_id);
        if (!callData) {
            return res.json({ status: 'ended', message: 'Call not found or expired' });
        }

        res.json({
            ok: true,
            call_id,
            status: callData.status,
            type: callData.type,
            created_at: callData.created_at
        });
    } catch (err) {
        console.error('Get call status error:', err.message);
        res.status(500).json({ error: 'Failed to get call status' });
    }
});

module.exports = router;
