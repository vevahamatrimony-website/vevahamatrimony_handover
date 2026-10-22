/**
 * plan-features.js — VevahaMatrimony Global Plan Feature Gating
 * Load this on every authenticated page.
 * Usage: window.PlanFeatures.check(plan, feature) → true/false
 *        window.PlanFeatures.applyGating(plan)     → locks UI elements
 *        window.PlanFeatures.showUpgradePrompt(feature, requiredPlan)
 */
(function () {
    'use strict';

    // ── Feature Matrix ──────────────────────────────────────────
    const MATRIX = {
        free:    { profile_view:true, send_request:true, messaging:false,    message_limit:0,  external_links:false, voice_call:false, video_call:false, priority_listing:false, manager_support:false },
        silver:  { profile_view:true, send_request:true, messaging:true,     message_limit:15, external_links:false, voice_call:false, video_call:false, priority_listing:false, manager_support:false },
        gold:    { profile_view:true, send_request:true, messaging:true,     message_limit:10, external_links:false, voice_call:false, video_call:false, priority_listing:false, manager_support:false },
        diamond: { profile_view:true, send_request:true, messaging:true,     message_limit:null,external_links:true, voice_call:true,  video_call:true,  priority_listing:true,  manager_support:false },
        vip:     { profile_view:true, send_request:true, messaging:true,     message_limit:null,external_links:true, voice_call:true,  video_call:true,  priority_listing:true,  manager_support:true  }
    };

    const PLAN_LABELS = {
        free: 'Free', silver: 'Silver', gold: 'Gold', diamond: 'Diamond', vip: 'VIP'
    };

    const UPGRADE_MAP = {
        messaging:        'gold',
        external_links:   'diamond',
        voice_call:       'diamond',
        video_call:       'diamond',
        priority_listing: 'diamond',
        manager_support:  'vip'
    };

    const FEATURE_NAMES = {
        messaging:'Messaging', external_links:'External Links', voice_call:'Voice Call',
        video_call:'Video Call', priority_listing:'Priority Listing', manager_support:'Manager Support'
    };

    // ── Core check ──────────────────────────────────────────────
    function check(plan, feature) {
        const p = (plan || 'free').toLowerCase();
        const features = MATRIX[p] || MATRIX.free;
        return !!features[feature];
    }

    function get(plan, feature) {
        const p = (plan || 'free').toLowerCase();
        const features = MATRIX[p] || MATRIX.free;
        return features[feature];
    }

    // ── Upgrade prompt modal ────────────────────────────────────
    function showUpgradePrompt(feature, currentPlan) {
        const requiredPlan = UPGRADE_MAP[feature] || 'gold';
        const featName = FEATURE_NAMES[feature] || feature;
        const reqLabel = PLAN_LABELS[requiredPlan] || requiredPlan;

        // Remove existing
        const old = document.getElementById('__pfUpgradeModal');
        if (old) old.remove();

        const overlay = document.createElement('div');
        overlay.id = '__pfUpgradeModal';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;animation:pfFadeIn 0.2s ease';
        overlay.innerHTML = `
            <div style="background:#fff;border-radius:24px;max-width:420px;width:100%;padding:36px 28px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.2);animation:pfSlideUp 0.25s ease">
                <div style="width:64px;height:64px;background:linear-gradient(135deg,#f9a8d4,#ec4899);border-radius:20px;display:flex;align-items:center;justify-content:center;margin:0 auto 20px">
                    <svg width="28" height="28" fill="none" stroke="white" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <h3 style="font-size:22px;font-weight:700;color:#111;margin-bottom:8px">Upgrade Required</h3>
                <p style="color:#6b7280;font-size:15px;margin-bottom:20px">
                    <strong style="color:#ec4899">${featName}</strong> is available on the
                    <strong style="color:#7c3aed">${reqLabel} Plan</strong> and above.
                </p>
                <div style="display:flex;gap:10px;justify-content:center">
                    <a href="home.html#plans" style="flex:1;padding:12px 0;background:linear-gradient(135deg,#ec4899,#7c3aed);color:white;border-radius:12px;font-weight:700;font-size:14px;text-decoration:none">
                        🚀 Upgrade Now
                    </a>
                    <button onclick="document.getElementById('__pfUpgradeModal').remove()"
                        style="flex:1;padding:12px 0;background:#f3f4f6;color:#374151;border:none;border-radius:12px;font-weight:700;font-size:14px;cursor:pointer">
                        Maybe Later
                    </button>
                </div>
            </div>`;

        // Close on backdrop click
        overlay.addEventListener('click', function(e){ if(e.target===overlay) overlay.remove(); });

        if (!document.getElementById('__pfStyles')) {
            const s = document.createElement('style');
            s.id = '__pfStyles';
            s.textContent = '@keyframes pfFadeIn{from{opacity:0}to{opacity:1}}@keyframes pfSlideUp{from{transform:translateY(24px);opacity:0}to{transform:translateY(0);opacity:1}}';
            document.head.appendChild(s);
        }
        document.body.appendChild(overlay);
    }

    // ── Apply gating to DOM ─────────────────────────────────────
    // Elements with data-plan-required="feature_name" get locked/unlocked
    function applyGating(plan) {
        const p = (plan || 'free').toLowerCase();

        document.querySelectorAll('[data-plan-required]').forEach(function(el) {
            const feature = el.getAttribute('data-plan-required');
            const allowed = check(p, feature);

            if (allowed) {
                el.removeAttribute('data-pf-locked');
                el.style.opacity = '';
                el.style.pointerEvents = '';
                // Remove lock badge if any
                const badge = el.querySelector('.__pfLock');
                if (badge) badge.remove();
            } else {
                el.setAttribute('data-pf-locked', '1');
                el.style.opacity = '0.55';
                el.style.pointerEvents = 'none';
                if (!el.querySelector('.__pfLock')) {
                    const badge = document.createElement('span');
                    badge.className = '__pfLock';
                    badge.style.cssText = 'display:inline-flex;align-items:center;gap:4px;background:#fce7f3;color:#be185d;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;margin-left:8px;vertical-align:middle';
                    badge.innerHTML = '🔒 Upgrade';
                    el.appendChild(badge);
                }
                // Re-enable pointer for click to show upgrade prompt
                el.style.pointerEvents = 'auto';
                el.setAttribute('data-pf-feature', feature);
            }
        });

        // Wire click on locked elements → upgrade prompt
        document.querySelectorAll('[data-pf-locked="1"]').forEach(function(el) {
            el.__pfHandler = function(e) {
                e.preventDefault();
                e.stopPropagation();
                showUpgradePrompt(el.getAttribute('data-pf-feature'), p);
            };
            el.addEventListener('click', el.__pfHandler, true);
        });
    }

    // ── Feature table HTML helper ───────────────────────────────
    function featureTableHTML(plan) {
        const p = (plan || 'free').toLowerCase();
        const f = MATRIX[p] || MATRIX.free;
        const rows = [
            ['Profile View',      f.profile_view],
            ['Send Request',      f.send_request],
            ['Messaging',         f.messaging ? (f.message_limit ? f.message_limit+'/week' : 'Unlimited') : false],
            ['External Links',    f.external_links],
            ['Voice Call',        f.voice_call],
            ['Video Call',        f.video_call],
            ['Priority Listing',  f.priority_listing],
            ['Manager Support',   f.manager_support]
        ];
        return rows.map(function(r) {
            const val = r[1];
            let badge;
            if (val === false)        badge = '<span style="color:#dc2626;font-weight:700">✗ Not available</span>';
            else if (val === true)    badge = '<span style="color:#16a34a;font-weight:700">✓ Included</span>';
            else                      badge = '<span style="color:#d97706;font-weight:700">✓ '+val+'</span>';
            return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f3f4f6">'
                 + '<span style="color:#374151;font-size:14px">'+r[0]+'</span>'+badge+'</div>';
        }).join('');
    }

    // ── Export ──────────────────────────────────────────────────
    window.PlanFeatures = {
        check: check,
        get: get,
        applyGating: applyGating,
        showUpgradePrompt: showUpgradePrompt,
        featureTableHTML: featureTableHTML,
        MATRIX: MATRIX,
        PLAN_LABELS: PLAN_LABELS
    };
})();
