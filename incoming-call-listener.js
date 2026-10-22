/**
 * incoming-call-listener.js
 * Polls /api/signal/pending every 3 seconds for incoming calls.
 * Add this to all dashboard pages: home.html, connections.html, matches.html, etc.
 */

(function () {
    'use strict';

    let pollInterval = null;
    let shownCallIds = new Set(); // Prevent showing the same call twice
    let activeNotification = null;

    function getToken() {
        let t = localStorage.getItem('vm_token');
        if (t) return t;
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) {
                try {
                    const session = JSON.parse(localStorage.getItem(k));
                    if (session && session.access_token) return session.access_token;
                } catch(e) {}
            }
        }
        return '';
    }

    // ── Styles ────────────────────────────────────────────────────
    function injectStyles() {
        if (document.getElementById('icl-styles')) return;
        const style = document.createElement('style');
        style.id = 'icl-styles';
        style.textContent = `
            #incomingCallOverlay {
                position: fixed;
                bottom: 24px;
                right: 24px;
                z-index: 999999;
                max-width: 340px;
                width: calc(100vw - 48px);
                animation: iclSlideIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
            }
            @keyframes iclSlideIn {
                from { opacity: 0; transform: translateY(40px) scale(0.9); }
                to   { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes iclSlideOut {
                from { opacity: 1; transform: translateY(0) scale(1); }
                to   { opacity: 0; transform: translateY(40px) scale(0.9); }
            }
            .icl-card {
                background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
                border: 1px solid rgba(139, 92, 246, 0.4);
                border-radius: 24px;
                padding: 20px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(139,92,246,0.2);
                color: white;
                font-family: 'Poppins', sans-serif;
            }
            .icl-header {
                display: flex;
                align-items: center;
                gap: 14px;
                margin-bottom: 16px;
            }
            .icl-avatar-wrap { position: relative; flex-shrink: 0; }
            .icl-avatar {
                width: 56px; height: 56px; border-radius: 50%; object-fit: cover;
                border: 2px solid rgba(236,72,153,0.6); background: #312e81;
            }
            .icl-ripple-dot {
                position: absolute; top: -2px; right: -2px;
                width: 14px; height: 14px; background: #10b981;
                border-radius: 50%; border: 2px solid #1e1b4b;
            }
            @keyframes ripplePulse {
                0% { box-shadow: 0 0 0 0 rgba(16,185,129,0.7); }
                100% { box-shadow: 0 0 0 8px rgba(16,185,129,0); }
            }
            .icl-ripple-dot { animation: ripplePulse 1s ease-out infinite; }
            .icl-info { flex: 1; min-width: 0; }
            .icl-label {
                font-size: 11px; font-weight: 600; text-transform: uppercase;
                letter-spacing: 1px; color: rgba(196,181,253,0.8); margin-bottom: 2px;
            }
            .icl-name {
                font-size: 16px; font-weight: 700; color: white;
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            }
            .icl-sub { font-size: 12px; color: rgba(196,181,253,0.6); margin-top: 1px; }
            .icl-actions { display: flex; gap: 10px; }
            .icl-btn {
                flex: 1; padding: 12px; border-radius: 16px; border: none;
                font-family: 'Poppins', sans-serif; font-size: 13px; font-weight: 700;
                cursor: pointer; display: flex; align-items: center;
                justify-content: center; gap: 8px; transition: all 0.2s ease;
            }
            .icl-btn:hover { transform: scale(1.04); }
            .icl-btn:active { transform: scale(0.97); }
            .icl-decline {
                background: rgba(239,68,68,0.15); color: #fca5a5;
                border: 1px solid rgba(239,68,68,0.4);
            }
            .icl-accept {
                background: linear-gradient(135deg, #10b981, #059669);
                color: white; box-shadow: 0 4px 16px rgba(16,185,129,0.4);
            }
            .icl-countdown {
                text-align: center; font-size: 11px;
                color: rgba(196,181,253,0.5); margin-top: 10px;
            }
        `;
        document.head.appendChild(style);
    }

    // ── Show incoming call overlay ────────────────────────────────
    function showIncomingCallOverlay(call) {
        const { callId, fromMemberId, fromName, fromAvatar, callType } = call;

        if (shownCallIds.has(callId)) return; // Already showing/shown
        shownCallIds.add(callId);

        dismissOverlay(false);
        injectStyles();

        const isVideo = callType === 'video';
        const labelText = isVideo ? '📹 Incoming Video Call' : '📞 Incoming Voice Call';
        const callPage = isVideo
            ? `video-call.html?caller=${encodeURIComponent(fromMemberId)}&callId=${encodeURIComponent(callId)}`
            : `voice-call.html?caller=${encodeURIComponent(fromMemberId)}&callId=${encodeURIComponent(callId)}`;

        const avatarSrc = fromAvatar
            || `https://ui-avatars.com/api/?name=${encodeURIComponent(fromName)}&background=6d28d9&color=fff&size=128`;

        const overlay = document.createElement('div');
        overlay.id = 'incomingCallOverlay';
        overlay.innerHTML = `
            <div class="icl-card">
                <div class="icl-header">
                    <div class="icl-avatar-wrap">
                        <img class="icl-avatar" src="${avatarSrc}"
                             onerror="this.src='/images/placeholder-profile.svg'" alt="${fromName}">
                        <div class="icl-ripple-dot"></div>
                    </div>
                    <div class="icl-info">
                        <div class="icl-label">${labelText}</div>
                        <div class="icl-name">${fromName}</div>
                        <div class="icl-sub">VevahaMatrimony</div>
                    </div>
                </div>
                <div class="icl-actions">
                    <button class="icl-btn icl-decline" onclick="window.__iclDecline('${callId}')">
                        <i class="fas fa-phone-slash"></i> Decline
                    </button>
                    <button class="icl-btn icl-accept" onclick="window.__iclAccept('${callPage}', '${callId}')">
                        <i class="fas fa-phone"></i> Accept
                    </button>
                </div>
                <div class="icl-countdown" id="iclCountdown">Auto-dismiss in 30s</div>
            </div>
        `;

        document.body.appendChild(overlay);
        activeNotification = overlay;

        // Gentle audio beep
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            [0, 700, 1400].forEach(delay => {
                setTimeout(() => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain); gain.connect(ctx.destination);
                    osc.frequency.value = 880; osc.type = 'sine';
                    gain.gain.setValueAtTime(0.08, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
                    osc.start(); osc.stop(ctx.currentTime + 0.4);
                }, delay);
            });
        } catch (_) {}

        // Countdown auto-dismiss
        let count = 30;
        const countdownEl = document.getElementById('iclCountdown');
        const timer = setInterval(() => {
            count--;
            if (countdownEl) countdownEl.textContent = `Auto-dismiss in ${count}s`;
            if (count <= 0) { clearInterval(timer); dismissOverlay(true); }
        }, 1000);
        overlay._timer = timer;
    }

    function dismissOverlay(animate) {
        if (!activeNotification) return;
        clearInterval(activeNotification._timer);
        const el = activeNotification;
        activeNotification = null;
        if (animate) {
            el.style.animation = 'iclSlideOut 0.3s ease-in forwards';
            setTimeout(() => el.remove(), 300);
        } else {
            el.remove();
        }
    }

    // Button handlers
    window.__iclAccept = function (callPage, callId) {
        // Dismiss from backend pending list
        fetch('/api/signal/dismiss', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
            body: JSON.stringify({ callId, myMemberId: window.__iclMyMemberId })
        }).catch(() => {});
        dismissOverlay(false);
        window.location.href = callPage;
    };

    window.__iclDecline = function (callId) {
        // Tell caller we rejected
        fetch('/api/signal/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
            body: JSON.stringify({ type: 'call-rejected', callId, toMemberId: window.__iclRemoteForCallId?.[callId], fromMemberId: window.__iclMyMemberId })
        }).catch(() => {});
        fetch('/api/signal/dismiss', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
            body: JSON.stringify({ callId, myMemberId: window.__iclMyMemberId })
        }).catch(() => {});
        dismissOverlay(true);
    };

    // ── Poll for incoming calls ───────────────────────────────────
    async function pollPending(myMemberId) {
        try {
            const res = await fetch(`/api/signal/pending?myMemberId=${encodeURIComponent(myMemberId)}`,
                { headers: { 'Authorization': `Bearer ${getToken()}` } }
            );
            if (!res.ok) return;
            const { calls } = await res.json();
            if (calls && calls.length > 0) {
                // Store fromMemberId map for reject
                window.__iclRemoteForCallId = window.__iclRemoteForCallId || {};
                calls.forEach(c => { window.__iclRemoteForCallId[c.callId] = c.fromMemberId; });
                // Show the most recent not yet shown
                const unseen = calls.filter(c => !shownCallIds.has(c.callId));
                if (unseen.length > 0) showIncomingCallOverlay(unseen[0]);
            }
        } catch (_) {}
    }

    // ── Start ─────────────────────────────────────────────────────
    async function start() {
        // Wait until VMAuth is ready
        let waited = 0;
        while (waited < 8000) {
            if (window.VMAuth && VMAuth.isLoggedIn()) break;
            await new Promise(r => setTimeout(r, 300));
            waited += 300;
        }
        if (!window.VMAuth || !VMAuth.isLoggedIn()) return;

        const me = VMAuth.user();
        const myMemberId = me.member_id;
        if (!myMemberId) { console.warn('[ICL] No member_id — skipping'); return; }

        window.__iclMyMemberId = myMemberId;
        console.log('[ICL] Listening for calls for:', myMemberId);

        // Poll every 3 seconds
        pollPending(myMemberId); // immediate first poll
        pollInterval = setInterval(() => pollPending(myMemberId), 3000);
    }

    // Stop on page unload
    window.addEventListener('beforeunload', () => {
        if (pollInterval) clearInterval(pollInterval);
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }

    window.VevahaIncomingCallListener = {
        dismiss: () => dismissOverlay(true),
        stop: () => { if (pollInterval) clearInterval(pollInterval); }
    };
})();
