/**
 * webrtc-call.js — Pure WebRTC Call Engine for VevahaMatrimony
 * Signaling: HTTP polling via /api/signal/* (no WebSockets needed)
 * Works reliably through any nginx/Hostinger proxy.
 */

window.VevahaWebRTC = (function () {
    'use strict';

    // ── ICE Config ────────────────────────────────────────────────
    const ICE_SERVERS = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
            { urls: 'stun:stun.ekiga.net' },
            { urls: 'stun:stun.ideasip.com' },
            { urls: 'stun:stun.rixtelecom.se' },
            { urls: 'stun:stun.schlund.de' },
            { urls: 'stun:stun.voiparound.com' },
            { urls: 'stun:stun.voipbuster.com' },
            // Multiple Relay Layers specifically for strict Indian ISP firewalls
            { 
                urls: [
                    'turn:openrelay.metered.ca:80',
                    'turn:openrelay.metered.ca:443',
                    'turn:openrelay.metered.ca:443?transport=tcp',
                    'turns:openrelay.metered.ca:443?transport=tcp'
                ],
                username: 'openrelayproject',
                credential: 'openrelayproject'
            }
        ],
        iceCandidatePoolSize: 10,
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require'
    };

    // ── State ─────────────────────────────────────────────────────
    let peerConnection = null;
    let localStream = null;
    let remoteStream = null;
    let callId = null;
    let myMemberId = null;
    let remoteMemberId = null;
    let callType = 'audio';
    let role = null; // 'caller' | 'callee'
    let pollInterval = null;
    let iceQueue = [];
    let processedSignalIds = new Set();
    let lastPollTs = 0;
    let callTimer = null;
    let callSeconds = 0;
    let shouldAutoAnswer = false;

    // ── Callbacks ─────────────────────────────────────────────────
    let onCallEndedCallback = null;
    let onCallAnsweredCallback = null;
    let onRemoteStreamCallback = null;
    let onStatusChangeCallback = null;

    // ── Helpers ───────────────────────────────────────────────────
    function setStatus(msg) {
        console.log('[WebRTC]', msg);
        if (onStatusChangeCallback) onStatusChangeCallback(msg);
    }

    function generateCallId() {
        return 'call_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

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

    // ── HTTP Signal API ───────────────────────────────────────────
    async function apiPost(path, body) {
        const res = await fetch(path, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `Signal API error: ${res.status}`);
        }
        return res.json();
    }

    async function apiGet(path) {
        const res = await fetch(path, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!res.ok) return {};
        return res.json();
    }

    // ── Signal dispatch (incoming signals from poll) ──────────────
    async function handleSignal(sig) {
        if (!sig || !sig.type) return;
        
        // Deduplication: prevent processing the same packet twice
        if (sig.id) {
            if (processedSignalIds.has(sig.id)) return;
            processedSignalIds.add(sig.id);
            // Keep set small
            if (processedSignalIds.size > 100) {
                const first = processedSignalIds.values().next().value;
                processedSignalIds.delete(first);
            }
        }

        console.log(`[WebRTC DEBUG] 📥 HANDLING SIGNAL: ${sig.type} (ID: ${sig.id || 'N/A'})`);

        switch (sig.type) {
            case 'offer':
                // Guard: Only process offer if we are stable or just started
                if (peerConnection && peerConnection.signalingState !== 'stable' && peerConnection.signalingState !== 'have-local-offer') {
                    console.warn('[WebRTC] Ignoring duplicate offer, signalingState:', peerConnection.signalingState);
                    return;
                }
                await handleOffer(sig.data, sig.from);
                // Flush the queue for the callee immediately after the offer/desc is set
                if (iceQueue && iceQueue.length > 0) {
                    console.log('[WebRTC DEBUG] Flushing ICE queue for Callee...');
                    iceQueue.forEach(c => peerConnection.addIceCandidate(c).catch(console.warn));
                    iceQueue = [];
                }
                if (shouldAutoAnswer) {
                    await answerCall();
                    if (onCallAnsweredCallback) onCallAnsweredCallback();
                }
                break;

            case 'answer':
                // Guard: Only process answer if we are waiting for one
                if (!peerConnection || peerConnection.signalingState !== 'have-local-offer') {
                    console.warn('[WebRTC] Ignoring duplicate/invalid answer, signalingState:', peerConnection ? peerConnection.signalingState : 'null');
                    return;
                }
                setStatus('Call answered — connecting...');
                await peerConnection.setRemoteDescription(new RTCSessionDescription(sig.data));
                if (iceQueue && iceQueue.length > 0) {
                    iceQueue.forEach(c => peerConnection.addIceCandidate(c).catch(console.warn));
                    iceQueue = [];
                }
                if (onCallAnsweredCallback) onCallAnsweredCallback();
                break;

            case 'ice':
                try {
                    if (peerConnection && peerConnection.remoteDescription && sig.data) {
                        await peerConnection.addIceCandidate(new RTCIceCandidate(sig.data));
                    } else if (sig.data) {
                        iceQueue.push(new RTCIceCandidate(sig.data));
                    }
                } catch (e) {
                    console.warn('[WebRTC] ICE error:', e.message);
                }
                break;

            case 'end':
                setStatus('Call ended by other party');
                cleanup();
                if (onCallEndedCallback) onCallEndedCallback('ended');
                break;

            case 'reject':
                setStatus('Call was declined');
                cleanup();
                if (onCallEndedCallback) onCallEndedCallback('rejected');
                break;
        }
    }

    // ── Signal polling (1 second interval) ───────────────────────
    function startPolling() {
        // Must start at 0 so the callee receives the offer even if they
        // took e.g. 5 seconds to click "Accept" on the notification popup.
        lastPollTs = 0; 
        stopPolling();

        pollInterval = setInterval(async () => {
            try {
                const url = `/api/signal/poll?callId=${callId}&myMemberId=${encodeURIComponent(myMemberId)}&since=${lastPollTs}`;
                const data = await apiGet(url);
                if (data.ts) lastPollTs = data.ts;
                for (const sig of (data.signals || [])) {
                    await handleSignal(sig);
                }
            } catch (e) {
                console.warn('[WebRTC] Poll error:', e.message);
            }
        }, 1000);
    }

    function stopPolling() {
        if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
    }

    // ── Send a signal ─────────────────────────────────────────────
    async function sendSignal(type, data) {
        console.log(`[WebRTC DEBUG] 📡 PUSHING SIGNAL: ` + type);
        await apiPost('/api/signal/send', {
            callId,
            type,
            toMemberId: remoteMemberId,
            fromMemberId: myMemberId,
            data
        });
    }

    // ── Peer Connection ───────────────────────────────────────────
    function createPeerConnection() {
        if (peerConnection) { 
            console.log('[WebRTC] Closing existing PeerConnection...');
            peerConnection.close(); 
        }
        peerConnection = new RTCPeerConnection(ICE_SERVERS);

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                const c = event.candidate.candidate;
                const type = c.includes('typ relay') ? 'RELAY' : (c.includes('typ srflx') ? 'STUN' : 'HOST');
                console.log(`[WebRTC SHIELD] Gathered Candidate type: ${type}`);
                sendSignal('ice', event.candidate).catch(console.warn);
            }
        };

        peerConnection.ontrack = (event) => {
            remoteStream = event.streams[0];
            if (onRemoteStreamCallback) onRemoteStreamCallback(remoteStream);
            setStatus('Connected — call in progress');
            startCallTimer();
        };

        peerConnection.oniceconnectionstatechange = () => {
            console.log('[WebRTC DEBUG] ICE Connection State Changed to: ' + peerConnection.iceConnectionState);
        };
        peerConnection.onicegatheringstatechange = () => {
             console.log('[WebRTC DEBUG] ICE Gathering State Changed to: ' + peerConnection.iceGatheringState);
        };
        peerConnection.onconnectionstatechange = () => {
            const state = peerConnection.connectionState;
            setStatus('Connection: ' + state);
            
            if (state === 'failed') {
                console.warn('[WebRTC SHIELD] Primary path failed. Attempting brief wait for relay fallback...');
                // Give it 8 seconds to try and recover via TURN before giving up
                setTimeout(() => {
                    if (peerConnection && (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected')) {
                        console.error('[WebRTC SHIELD] Reconnection failed. Ending call.');
                        endCall();
                    }
                }, 8000);
            } else if (state === 'disconnected') {
                console.log('[WebRTC SHIELD] Connection dropped, waiting for potential ICE restart...');
            }
        };

        // Add local tracks
        if (localStream) {
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
            });
        }
    }

    async function handleOffer(offer, fromMemberId) {
        remoteMemberId = fromMemberId;
        role = 'callee';
        // PC is already created in initiateCallee, do not recreate here to avoid state loss
        if (!peerConnection) createPeerConnection();
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    }

    async function answerCall() {
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        await sendSignal('answer', answer);
        setStatus('Call answered — waiting for connection...');
    }

    // ── Media ─────────────────────────────────────────────────────
    async function getLocalMedia(type) {
        const constraints = {
            audio: true,
            video: type === 'video'
                ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
                : false
        };
        localStream = await navigator.mediaDevices.getUserMedia(constraints);
        return localStream;
    }

    // ── Call Timer ────────────────────────────────────────────────
    function startCallTimer() {
        callSeconds = 0;
        clearInterval(callTimer);
        callTimer = setInterval(() => {
            callSeconds++;
            const m = Math.floor(callSeconds / 60).toString().padStart(2, '0');
            const s = (callSeconds % 60).toString().padStart(2, '0');
            const time = `${m}:${s}`;
            ['callTimer', 'topTimer', 'waitTimer'].forEach(id => {
                const el = document.getElementById(id);
                if (el) { el.textContent = time; el.classList.remove('hidden'); }
            });
        }, 1000);
    }

    // ── Public API ────────────────────────────────────────────────

    /**
     * initiateCaller — caller starts the call
     * @param {string} receiverMemberId  - member_id of callee (e.g. VM75639588)
     * @param {string} type              - 'audio' or 'video'
     * @param {string} callerMemberId    - your member_id (VMAuth.user().member_id)
     */
    async function initiateCaller(receiverMemberId, type, callerMemberId) {
        try {
            myMemberId = callerMemberId;
            remoteMemberId = receiverMemberId;
            callType = type;
            role = 'caller';
            callId = generateCallId();
            shouldAutoAnswer = false;

            setStatus('Requesting microphone access...');
            await getLocalMedia(type);

            setStatus('Creating call...');
            createPeerConnection();

            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            setStatus('Sending call invitation...');
            const result = await apiPost('/api/signal/offer', {
                callId,
                toMemberId: receiverMemberId,
                callType: type,
                offer
            });

            // Start polling for answer
            startPolling();
            setStatus('Ringing — waiting for answer...');

            return { callId, localStream };
        } catch (err) {
            console.error('[WebRTC] Caller init error:', err);
            cleanup();
            throw err;
        }
    }

    /**
     * initiateCallee — callee joins after accepting from notification
     * @param {string} callerMemberId   - member_id of caller
     * @param {string} callIdParam      - callId from the notification
     * @param {string} type             - 'audio' or 'video'
     * @param {string} myMemberIdParam  - your member_id
     */
    async function initiateCallee(callerMemberId, callIdParam, type, myMemberIdParam) {
        try {
            myMemberId = myMemberIdParam;
            remoteMemberId = callerMemberId;
            callType = type;
            callId = callIdParam;
            role = 'callee';
            shouldAutoAnswer = true; // Auto-answer when offer arrives

            setStatus('Getting media access...');
            await getLocalMedia(type);

            createPeerConnection();

            // Dismiss from pending
            apiPost('/api/signal/dismiss', { callId, myMemberId }).catch(() => {});

            // Start polling — will auto-answer when offer signal arrives
            startPolling();
            setStatus('Connecting to call...');

            return { localStream };
        } catch (err) {
            console.error('[WebRTC] Callee init error:', err);
            cleanup();
            throw err;
        }
    }

    async function answer() {
        await answerCall();
    }

    async function endCall() {
        try { await sendSignal('end', null); } catch (_) {}
        cleanup();
        if (onCallEndedCallback) onCallEndedCallback('ended');
    }

    async function rejectCall() {
        try { await sendSignal('reject', null); } catch (_) {}
        cleanup();
    }

    function toggleMute() {
        if (!localStream) return false;
        const track = localStream.getAudioTracks()[0];
        if (track) { track.enabled = !track.enabled; return !track.enabled; }
        return false;
    }

    function toggleCamera() {
        if (!localStream) return false;
        const track = localStream.getVideoTracks()[0];
        if (track) { track.enabled = !track.enabled; return !track.enabled; }
        return false;
    }

    function cleanup() {
        stopPolling();
        clearInterval(callTimer); callTimer = null;
        iceQueue = [];
        if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
        if (peerConnection) { peerConnection.close(); peerConnection = null; }
    }

    // ── Callback Setters ──────────────────────────────────────────
    function onCallEnded(cb) { onCallEndedCallback = cb; }
    function onCallAnswered(cb) { onCallAnsweredCallback = cb; }
    function onRemoteStream(cb) { onRemoteStreamCallback = cb; }
    function onStatusChange(cb) { onStatusChangeCallback = cb; }

    return {
        initiateCaller,
        initiateCallee,
        answer,
        endCall,
        rejectCall,
        toggleMute,
        toggleCamera,
        onCallEnded,
        onCallAnswered,
        onRemoteStream,
        onStatusChange,
        getLocalStream: () => localStream,
        getCallId: () => callId
    };
})();
