/**
 * VevahaMatrimony — Frontend API Client
 * Connects frontend pages to the Node.js backend at port 3000
 */
(function () {
    'use strict';

    const API_BASE = ''; // Changed to empty string for unified Hostinger deployment
    const TIMEOUT_MS = {
        DEFAULT: 30000,      // 30 seconds for normal requests
        UPLOAD: 60000,       // 60 seconds for file uploads
        PAYMENT: 15000,      // 15 seconds for payment operations
    };

    // ── Timeout helper ─────────────────────────────────────────
    function createAbortController(timeoutMs) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        return { controller, timeoutId };
    }

    // ── Storage helpers ────────────────────────────────────────
    const Auth = {
        save(data) {
            localStorage.setItem('vm_token', data.access_token || '');
            localStorage.setItem('vm_refresh', data.refresh_token || '');
            localStorage.setItem('userData', JSON.stringify(data.user || {}));
        },
        token() { return localStorage.getItem('vm_token') || ''; },
        refresh() { return localStorage.getItem('vm_refresh') || ''; },
        user() { try { return JSON.parse(localStorage.getItem('userData') || '{}'); } catch { return {}; } },
        memberId() { return this.user()?.member_id || ''; },
        isLoggedIn() { return !!this.token(); },
        clear() {
            localStorage.removeItem('vm_token');
            localStorage.removeItem('vm_refresh');
            localStorage.removeItem('userData');
        }
    };

    // ── Core fetch wrapper ─────────────────────────────────────
    async function api(method, path, body, isForm = false, timeoutMs = TIMEOUT_MS.DEFAULT) {
        const headers = {};

        if (Auth.token()) headers['Authorization'] = `Bearer ${Auth.token()}`;
        if (!isForm) headers['Content-Type'] = 'application/json';

        const { controller, timeoutId } = createAbortController(timeoutMs);

        const opts = {
            method,
            headers,
            body: isForm
                ? body          // FormData
                : body ? JSON.stringify(body) : undefined,
            signal: controller.signal
        };

        try {
            let res = await fetch(API_BASE + path, opts);

            // Auto-refresh if 401
            if (res.status === 401 && Auth.refresh()) {
                const refreshAbort = createAbortController(TIMEOUT_MS.DEFAULT);
                try {
                    const refresh = await fetch(`${API_BASE}/api/auth/refresh`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ refresh_token: Auth.refresh() }),
                        signal: refreshAbort.controller.signal
                    });
                    if (refresh.ok) {
                        const tokens = await refresh.json();
                        localStorage.setItem('vm_token', tokens.access_token);
                        localStorage.setItem('vm_refresh', tokens.refresh_token);
                        headers['Authorization'] = `Bearer ${tokens.access_token}`;
                        res = await fetch(API_BASE + path, { ...opts, headers });
                    } else {
                        Auth.clear();
                        window.location.href = 'login.html';
                        return;
                    }
                } finally {
                    clearTimeout(refreshAbort.timeoutId);
                }
            }

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
            return data;
        } catch (err) {
            if (err.name === 'AbortError') {
                throw new Error(`API request timeout (${timeoutMs}ms): ${path}`);
            }
            throw err;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    // ══════════════════════════════════════════════════════════
    // PUBLIC API METHODS
    // ══════════════════════════════════════════════════════════
    const VM = {
        auth: {
            async register(payload) { return api('POST', '/api/auth/register', payload); },
            async login(email, password) { return api('POST', '/api/auth/login', { email, password }); },
            async syncGoogle() { return api('POST', '/api/auth/sync-google'); },
            async forgotPassword(email) { return api('POST', '/api/auth/forgot-password', { email }); },
            async resetPassword(newPw) { return api('POST', '/api/auth/reset-password', { new_password: newPw }); },
            async logout() { try { await api('POST', '/api/auth/logout'); } finally { Auth.clear(); window.location.href = 'login.html'; } },
            async refresh() { return api('POST', '/api/auth/refresh', { refresh_token: Auth.refresh() }); },
            async sendOTP(email) { return api('POST', '/api/auth/send-otp', { email }); },
            async verifyOTP(email, otp) { return api('POST', '/api/auth/verify-otp', { email, otp }); },
            getGoogleUrl() { return `${API_BASE}/api/auth/google-url`; }
        },
        profile: {
            async me() { return api('GET', `/api/profile/me?_t=${Date.now()}`); },
            async update(data) { return api('PUT', '/api/profile/me', data); },
            async get(memberId) { return api('GET', `/api/profile/${memberId}`); },
            async stats() { return api('GET', '/api/profile/stats'); },
            async delete() { return api('DELETE', '/api/profile/me'); },
            async browseUploaded() { return api('GET', '/api/profile/browse-uploaded'); },
            async updatePresence() {
                try { return await api('POST', '/api/profile/presence'); } catch (e) { return { ok: false }; }
            },
            async setOnlineStatus(isOnline) {
                try {
                    const result = await api('POST', '/api/profile/set-online-status', { is_online: isOnline });
                    if (result && result.ok) {
                        const user = Auth.user();
                        user.is_manually_online = isOnline;
                        user.last_seen = new Date().toISOString();
                        Auth.save({ access_token: Auth.token(), refresh_token: Auth.refresh(), user });
                    }
                    return result;
                } catch (e) {
                    console.error('Failed to set online status:', e);
                    return { ok: false };
                }
            },
            isOnline(lastSeen, isManuallyOnline) {
                if (isManuallyOnline === false) return false;
                if (!lastSeen) return false;
                const fiveMins = 5 * 60 * 1000;
                const lastSeenDate = new Date(lastSeen).getTime();
                return (Date.now() - lastSeenDate) < fiveMins;
            }
        },
        upload: {
            async photo(file) {
                const fd = new FormData(); fd.append('photo', file);
                return api('POST', '/api/upload/photo', fd, true, TIMEOUT_MS.UPLOAD);
            },
            async document(file, docType, docNumber) {
                const fd = new FormData();
                fd.append('document', file);
                fd.append('doc_type', docType);
                if (docNumber) fd.append('doc_number', docNumber);
                return api('POST', '/api/upload/document', fd, true, TIMEOUT_MS.UPLOAD);
            },
            async horoscope(file) {
                const fd = new FormData(); fd.append('horoscope', file);
                return api('POST', '/api/upload/horoscope', fd, true, TIMEOUT_MS.UPLOAD);
            }
        },
        matches: {
            async all(filters = {}) {
                const q = new URLSearchParams(filters).toString();
                return api('GET', `/api/matches?${q}`);
            },
            async search(query, page = 1) { 
                return api('GET', `/api/search?q=${encodeURIComponent(query)}&page=${page}`); 
            }
        },
        messages: {
            async inbox() { return api('GET', '/api/messages'); },
            async thread(memberId) { return api('GET', `/api/messages/${memberId}`); },
            async send(toMemberId, content) { return api('POST', '/api/messages/send', { to_member_id: toMemberId, content }); }
        },
        requests: {
            async all() { return api('GET', '/api/requests'); },
            async send(toMemberId) { return api('POST', '/api/requests/send', { receiver_id: toMemberId }); },
            async accept(id) { return api('PUT', `/api/requests/${id}/accept`); },
            async reject(id) { return api('PUT', `/api/requests/${id}/reject`); },
            async withdraw(id) { return api('DELETE', `/api/requests/${id}`); }
        },
        payment: {
            async createOrder(plan) { return api('POST', '/api/payment/create-order', { plan }, false, TIMEOUT_MS.PAYMENT); },
            async verify(payload) {
                const data = typeof payload === 'object' ? payload : {
                    razorpay_order_id: arguments[0],
                    razorpay_payment_id: arguments[1],
                    razorpay_signature: arguments[2],
                    plan: arguments[3]
                };
                return api('POST', '/api/payment/verify', data, false, TIMEOUT_MS.PAYMENT);
            },
            async history() { return api('GET', '/api/payment/history'); }
        },
        membership: {
            async status() { return api('GET', '/api/membership/status'); },
            async check(action) { return api('POST', '/api/membership/check', { action }); },
            canAccess(feature) {
                const user = Auth.user();
                const plan = (user.plan_name || 'free').toLowerCase();
                const levels = { free: 0, silver: 1, gold: 2, diamond: 3, vip: 4 };
                const requirements = {
                    'view_contact': 1,  // Silver+
                    'send_message': 2,  // Gold+
                    'voice_video': 3,   // Diamond+
                    'concierge': 4      // VIP only
                };
                return (levels[plan] || 0) >= (requirements[feature] || 0);
            }
        }
    };

    // ── UI Toast ───────────────────────────────────────────────
    VM.toast = function (msg, type = 'info') {
        const colors = { success: '#10b981', error: '#ef4444', info: '#6366f1', warn: '#f59e0b' };
        const el = document.createElement('div');
        el.style.cssText = `
            position:fixed; top:80px; right:20px; z-index:999999;
            background:${colors[type] || colors.info}; color:#fff;
            padding:14px 22px; border-radius:16px;
            font-family:Poppins,sans-serif; font-size:14px; font-weight:600;
            box-shadow:0 8px 32px rgba(0,0,0,0.2);
            animation:slideIn .3s ease-out;
            max-width:320px; display:flex; align-items:center; gap:10px;
        `;
        const icons = { success: '✅', error: '❌', info: 'ℹ️', warn: '⚠️' };
        el.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${msg}</span>`;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), type === 'error' ? 5000 : 3000);
    };

    // ── Loading button helper ──────────────────────────────────
    VM.setLoading = function (btn, loading, text) {
        if (!btn) return;
        btn.disabled = loading;
        btn.textContent = loading ? '⏳ Please wait...' : text;
    };

    // Expose globally
    window.VM = VM;
    window.VMAuth = Auth;
    window.VMAPI_BASE = API_BASE;

    console.log('✅ VevahaMatrimony API client ready · backend:', API_BASE);

    // ── Global Navbar UI Updater ─────────────────────────────────
    function syncGlobalNavbar() {
        if (!Auth.isLoggedIn()) return;
        const u = Auth.user();
        
        const navName = document.getElementById('navUserName');
        if (navName) navName.textContent = u.full_name ? u.full_name.split(' ')[0] : 'Member';
        
        const navPlan = document.getElementById('navPlanLabel');
        if (navPlan) navPlan.textContent = (u.plan_name || 'Free Plan').charAt(0).toUpperCase() + (u.plan_name || 'Free Plan').slice(1);
        
        const initEl = document.getElementById('userInitials');
        if (initEl && u.full_name) {
            if (u.profile_picture_url) {
                initEl.innerHTML = '<img src="' + u.profile_picture_url + '" class="w-full h-full object-cover rounded-full" alt="Profile" onerror="this.onerror=null;this.src=\'https://ui-avatars.com/api/?name=' + encodeURIComponent(u.full_name) + '&background=ec4899&color=fff\'"/>';
            } else {
                initEl.textContent = (u.full_name.substring(0,2)).toUpperCase();
            }
        }
    }
    
    // Run on DOM loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', syncGlobalNavbar);
    } else {
        syncGlobalNavbar();
    }

    // ── Global Presence Tracking ───────────────────────────────
    if (Auth.isLoggedIn()) {
        VM.profile.updatePresence(); // Initial ping
        setInterval(() => {
            if (Auth.isLoggedIn()) VM.profile.updatePresence();
        }, 180000); // 3 minutes
    }
})();
