/**
 * auth-guard.js
 * Automatically redirects unauthenticated users and restricts free-tier accounts.
 */
(function () {
    const token = localStorage.getItem('vm_token');
    const userRaw = localStorage.getItem('userData') || '{}';
    let user = {};
    try {
        user = JSON.parse(userRaw);
    } catch (e) {
        user = {};
    }

    const path = window.location.pathname.split('/').pop() || 'index.html';
    const plan = (user.plan_name || 'free').toLowerCase();

    // ── 1. AUTH GUARD: Guest Redirect ──────────────────────────
    // List of pages that REQUIRES being logged in
    const DASHBOARD_PAGES = [
        'home.html', 'matches.html', 'messages.html', 'requests.html', 
        'active-members-dash.html', 'browse-members.html', 'connections.html', 
        'interested-profiles.html', 'settings.html', 'billing.html', 
        'profile.html', 'search-results.html', 'account-settings.html',
        'chatbot.html', 'vevaha-ai.html', 'advanced-search.html', 
        'video-call.html', 'voice-call.html', 'incoming-call.html',
        'edit-profile.html', 'verify-documents.html', 'horoscopic-chatbot.html',
        'active-members.html'
    ];

    if (!token) {
        if (DASHBOARD_PAGES.includes(path)) {
            console.warn('[Guard] Access denied. Redirecting to login.');
            window.location.href = 'login.html';
            return;
        }
    }

    // ── 2. PLAN GUARD: Free Tier Restriction ───────────────────
    if (token) {
        const gender = (user.gender || '').toLowerCase();
        const isNewRegistrationPending = localStorage.getItem('pending_reg_popup') === '1' || !!localStorage.getItem('reg_gender_hint');

        if (plan === 'free') {
            if (gender === 'male') {
                // For male users on free plan, block EVERYTHING except billing
                const MALE_ALLOWED_PAGES = ['billing.html', 'login.html'];
                if (DASHBOARD_PAGES.includes(path) && !MALE_ALLOWED_PAGES.includes(path)) {
                    console.warn('[Guard] Male free account blocked. Redirecting to billing.');
                    if (document.readyState === 'loading') {
                        document.addEventListener('DOMContentLoaded', () => alertMalePaymentCompulsory());
                    } else {
                        alertMalePaymentCompulsory();
                    }
                    return;
                }
            } else {
                // Female profiles on free plan: can access ALL pages and see all male profiles
                // Actions like sending requests, viewing contacts, and accepting requests are gated at the action level
                // No page-level redirect or block is applied
            }
        }
    }

    function alertMalePaymentCompulsory() {
        alert('Membership payment is compulsory for male profiles. Please select a plan to activate your account.');
        window.location.href = 'billing.html?new_registration=1';
    }

    function alertFemaleRegistrationPending() {
        alert('Please select a membership plan or click Skip to complete registration and access the dashboard.');
        window.location.href = 'billing.html?new_registration=1';
    }

    function alertTierRestriction() {
        alert('This feature is for Premium members only. Upgrade your plan to unlock full access.');
        window.location.href = 'billing.html';
    }
})();
