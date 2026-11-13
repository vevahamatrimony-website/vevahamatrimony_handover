// ============================================================
// VevahaMatrimony – PWA Install Banner
// Shows a one-time "Install App" top banner on mobile devices.
// Uses localStorage key 'vm_install_banner_shown' to ensure
// it is displayed ONLY ONCE across all page navigations.
// ============================================================
(function () {
    'use strict';

    // ── 1. Early-exit guards ─────────────────────────────────
    // Only show on mobile viewports
    if (window.innerWidth >= 768) return;

    // Don't show if already seen/dismissed
    if (localStorage.getItem('vm_install_banner_shown')) return;

    // Don't show if already running as an installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (window.navigator.standalone === true) return; // iOS PWA

    // ── 2. Helpers ───────────────────────────────────────────
    var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    var isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    function markShown() {
        try { localStorage.setItem('vm_install_banner_shown', '1'); } catch (e) { /* private mode */ }
    }

    // ── 3. Build & inject the banner DOM ─────────────────────
    function createBanner() {
        var banner = document.createElement('div');
        banner.id = 'vm-pwa-install-banner';
        banner.setAttribute('role', 'banner');
        banner.style.cssText = [
            'position:fixed', 'top:0', 'left:0', 'right:0',
            'z-index:999998',
            'background:linear-gradient(135deg,#ec4899 0%,#db2777 100%)',
            'color:#fff',
            'padding:10px 14px',
            'display:flex',
            'align-items:center',
            'justify-content:space-between',
            'gap:10px',
            'box-shadow:0 2px 16px rgba(0,0,0,0.28)',
            'font-family:Poppins,sans-serif',
            'font-size:13px',
            'transform:translateY(-100%)',
            'transition:transform 0.38s cubic-bezier(.4,0,.2,1)',
            '-webkit-transform:translateY(-100%)',
            '-webkit-transition:-webkit-transform 0.38s cubic-bezier(.4,0,.2,1)'
        ].join(';');

        // Left: logo + text
        var left = document.createElement('div');
        left.style.cssText = 'display:flex;align-items:center;gap:10px;flex:1;min-width:0;overflow:hidden';

        var logoImg = document.createElement('img');
        logoImg.src = '/images/vevaha-logo.png';
        logoImg.alt = '';
        logoImg.style.cssText = 'width:34px;height:34px;border-radius:8px;flex-shrink:0;object-fit:cover';
        logoImg.onerror = function () {
            this.style.display = 'none';
        };

        var textDiv = document.createElement('div');
        textDiv.style.cssText = 'min-width:0;overflow:hidden';
        textDiv.innerHTML =
            '<div style="font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Install VevahaMatrimony</div>' +
            '<div style="font-size:11px;opacity:0.88;margin-top:1px">' +
            (isIOS && isSafari
                ? 'Tap \u{1F4E4} Share → Add to Home Screen'
                : 'Get the full app experience') +
            '</div>';

        left.appendChild(logoImg);
        left.appendChild(textDiv);

        // Right: install button + close button
        var right = document.createElement('div');
        right.style.cssText = 'display:flex;align-items:center;gap:8px;flex-shrink:0';

        // Show "Install" button only on Android/Chrome (where beforeinstallprompt works)
        if (!isIOS) {
            var installBtn = document.createElement('button');
            installBtn.textContent = 'Install';
            installBtn.style.cssText = [
                'background:#fff', 'color:#db2777', 'border:none',
                'padding:7px 16px', 'border-radius:20px',
                'font-weight:700', 'font-size:12px', 'cursor:pointer',
                'white-space:nowrap',
                'font-family:Poppins,sans-serif',
                'box-shadow:0 1px 4px rgba(0,0,0,0.15)'
            ].join(';');
            installBtn.addEventListener('click', function () {
                if (typeof window.installPWA === 'function') {
                    window.installPWA().then(function (result) {
                        if (result && result.outcome === 'accepted') {
                            removeBanner();
                        }
                    }).catch(function () { /* ignore */ });
                }
                removeBanner();
            });
            right.appendChild(installBtn);
        }

        // Close (×) button
        var closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times;';
        closeBtn.setAttribute('aria-label', 'Close');
        closeBtn.style.cssText = [
            'background:rgba(255,255,255,0.22)', 'color:#fff',
            'border:none', 'width:30px', 'height:30px',
            'border-radius:50%', 'font-size:20px', 'line-height:1',
            'cursor:pointer', 'display:flex', 'align-items:center',
            'justify-content:center', 'flex-shrink:0',
            'font-family:sans-serif', 'padding:0'
        ].join(';');
        closeBtn.addEventListener('click', function () { removeBanner(); });
        right.appendChild(closeBtn);

        banner.appendChild(left);
        banner.appendChild(right);
        return banner;
    }

    var bannerEl = null;

    function removeBanner() {
        if (!bannerEl) return;
        bannerEl.style.transform = 'translateY(-100%)';
        bannerEl.style.webkitTransform = 'translateY(-100%)';
        setTimeout(function () {
            if (bannerEl && bannerEl.parentNode) bannerEl.parentNode.removeChild(bannerEl);
            bannerEl = null;
        }, 400);
    }

    function showBanner() {
        if (bannerEl) return; // already showing
        markShown(); // mark immediately so back-navigation doesn't re-show

        bannerEl = createBanner();

        // Insert at very top of body
        if (document.body.firstChild) {
            document.body.insertBefore(bannerEl, document.body.firstChild);
        } else {
            document.body.appendChild(bannerEl);
        }

        // Slide down after a short delay (for transition to take effect)
        setTimeout(function () {
            if (!bannerEl) return;
            bannerEl.style.transform = 'translateY(0)';
            bannerEl.style.webkitTransform = 'translateY(0)';
        }, 60);

        // Auto-dismiss after 12 seconds
        setTimeout(function () { removeBanner(); }, 12000);
    }

    // ── 4. Trigger logic ─────────────────────────────────────

    // iOS Safari: show after DOM ready (no install event available)
    if (isIOS) {
        function iosTrigger() {
            setTimeout(showBanner, 1200);
        }
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', iosTrigger, { once: true });
        } else {
            iosTrigger();
        }
        return;
    }

    // Android/Chrome: wait for `beforeinstallprompt` to have been captured by pwa-register.js
    // Poll for window.installPWA availability (set by pwa-register.js when prompt is captured)
    var pollCount = 0;
    var pollMax = 60; // 6 seconds max
    var pollInterval = setInterval(function () {
        pollCount++;
        if (typeof window.installPWA === 'function' && window._vmPWAPromptAvailable) {
            clearInterval(pollInterval);
            setTimeout(showBanner, 1000);
        } else if (pollCount >= pollMax) {
            clearInterval(pollInterval);
            // Prompt may not be available (site conditions or already installed) — skip banner
        }
    }, 100);

})();

