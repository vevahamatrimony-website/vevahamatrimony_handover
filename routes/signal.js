/**
 * backend/routes/signal.js
 * In-memory HTTP signaling for WebRTC calls.
 * No database needed — signals live in RAM for the duration of the call.
 */

const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { supabaseAdmin } = require('../lib/supabase');

// ── In-memory stores ──────────────────────────────────────────────
// signals:      callId -> [ { type, from, to, data, ts } ]
// pendingCalls: toMemberId -> [ { callId, from, name, avatar, callType, ts } ]
const signals = new Map();
const pendingCalls = new Map();
let globalSignalSeq = 1;

// Auto-cleanup every 5 minutes
setInterval(() => {
    const cutoff = Date.now() - 10 * 60 * 1000;
    for (const [k, list] of signals.entries()) {
        const fresh = list.filter(s => s.ts > cutoff);
        if (!fresh.length) signals.delete(k); else signals.set(k, fresh);
    }
    for (const [k, list] of pendingCalls.entries()) {
        const fresh = list.filter(c => c.ts > cutoff);
        if (!fresh.length) pendingCalls.delete(k); else pendingCalls.set(k, fresh);
    }
}, 5 * 60 * 1000);

function push(map, key, val) {
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(val);
}

// ── Helper: resolve member_id -> profile data ─────────────────────
async function getMemberProfile(userId) {
    try {
        const { data } = await supabaseAdmin
            .from('profiles')
            .select('member_id, full_name, profile_picture_url')
            .eq('id', userId)
            .single();
        return data || {};
    } catch (_) { return {}; }
}

// ══════════════════════════════════════════════════════════════════
// POST /api/signal/offer
// Caller sends their WebRTC offer + creates incoming call notification
// Body: { callId, toMemberId, callType, offer }
// ══════════════════════════════════════════════════════════════════
router.post('/offer', requireAuth, async (req, res) => {
    try {
        const { callId, toMemberId, callType, offer } = req.body;
        if (!callId || !toMemberId || !offer) {
            return res.status(400).json({ error: 'callId, toMemberId and offer required' });
        }

        const caller = await getMemberProfile(req.userId);
        const fromMemberId = caller.member_id;

        // Store the offer signal
        push(signals, callId, {
            id: globalSignalSeq++, type: 'offer', from: fromMemberId, to: toMemberId,
            data: offer, ts: Date.now()
        });

        // Store pending call notification so callee's dashboard can pick it up
        push(pendingCalls, toMemberId, {
            callId,
            fromMemberId,
            fromName: caller.full_name || 'Member',
            fromAvatar: caller.profile_picture_url || '',
            callType: callType || 'audio',
            ts: Date.now()
        });

        console.log(`[Signal] Offer stored: ${callId} → ${toMemberId}`);
        res.json({ ok: true, fromMemberId });
    } catch (err) {
        console.error('[Signal] offer error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ══════════════════════════════════════════════════════════════════
// POST /api/signal/send
// Send any signal: answer | ice | end | reject
// Body: { callId, type, toMemberId, fromMemberId, data }
// ══════════════════════════════════════════════════════════════════
router.post('/send', requireAuth, (req, res) => {
    try {
        const { callId, type, toMemberId, fromMemberId, data } = req.body;
        if (!callId || !type || !toMemberId) {
            return res.status(400).json({ error: 'callId, type and toMemberId required' });
        }

        push(signals, callId, { id: globalSignalSeq++, type, from: fromMemberId, to: toMemberId, data, ts: Date.now() });
        console.log(`[SIGNAL ROUTE] 📩 RECEIVED ` + type + ` from ` + fromMemberId + ` to ` + toMemberId);

        // Remove from pending if call is ending
        if (type === 'end' || type === 'reject') {
            for (const [key, list] of pendingCalls.entries()) {
                pendingCalls.set(key, list.filter(c => c.callId !== callId));
            }
        }

        res.json({ ok: true });
    } catch (err) {
        console.error('[Signal] send error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ══════════════════════════════════════════════════════════════════
// GET /api/signal/poll?callId=xxx&myMemberId=xxx&since=xxx
// The callee/caller polls this every second to get new signals
// ══════════════════════════════════════════════════════════════════
router.get('/poll', requireAuth, (req, res) => {
    const { callId, myMemberId, since = 0 } = req.query;
    if (!callId || !myMemberId) {
        return res.status(400).json({ error: 'callId and myMemberId required' });
    }

    const list = signals.get(callId) || [];
    // Convert 'since' to Number, default to 0
    const sinceId = Number(since) || 0;
    const filtered = list.filter(s => s.to === myMemberId && (s.id ? s.id > sinceId : s.ts > sinceId));
    
    // Find absolute maximum ID we just sent, fallback to 'sinceId' so no packets get ignored in future loops
    const maxId = filtered.length > 0 ? Math.max(...filtered.map(s => s.id || s.ts)) : sinceId;
    if(filtered.length > 0) { console.log(`[SIGNAL ROUTE] 📤 DELIVERED ` + filtered.length + ` signals to ` + myMemberId + ` [Types: ` + filtered.map(f=>f.type).join(', ') + `]`); }
    res.json({ signals: filtered, ts: maxId });
});

// ══════════════════════════════════════════════════════════════════
// GET /api/signal/pending?myMemberId=xxx
// Callee's dashboard polls this to detect incoming calls
// ══════════════════════════════════════════════════════════════════
router.get('/pending', requireAuth, (req, res) => {
    const { myMemberId } = req.query;
    if (!myMemberId) return res.status(400).json({ error: 'myMemberId required' });

    const list = pendingCalls.get(myMemberId) || [];
    // Only calls from last 35 seconds
    const recent = list.filter(c => Date.now() - c.ts < 35000);
    res.json({ calls: recent });
});

// ══════════════════════════════════════════════════════════════════
// POST /api/signal/dismiss
// Callee accepts or rejects — removes from pending
// Body: { callId, myMemberId }
// ══════════════════════════════════════════════════════════════════
router.post('/dismiss', requireAuth, (req, res) => {
    const { callId, myMemberId } = req.body;
    if (myMemberId && pendingCalls.has(myMemberId)) {
        const fresh = (pendingCalls.get(myMemberId) || []).filter(c => c.callId !== callId);
        pendingCalls.set(myMemberId, fresh);
    }
    res.json({ ok: true });
});

module.exports = router;
