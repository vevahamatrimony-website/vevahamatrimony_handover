// ============================================================
// VevahaMatrimony PWA Registration
// Registers the service worker and exposes install() for "Add to Home Screen"
// ============================================================
(function () {
    'use strict';

    let deferredPrompt = null;

    // Register service worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
            navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
                .then(function (reg) {
                    console.log('[PWA] Service Worker registered:', reg.scope);
                })
                .catch(function (err) {
                    console.log('[PWA] Service Worker registration failed:', err);
                });
        });
    }

    // Capture the beforeinstallprompt event (Chrome "Add to Home Screen")
    window.addEventListener('beforeinstallprompt', function (e) {
        e.preventDefault();
        deferredPrompt = e;
        window._vmPWAPromptAvailable = true; // Signal to pwa-install-banner.js
        console.log('[PWA] beforeinstallprompt captured');
    });

    // Expose a global install trigger (call window.installPWA() from a button if desired)
    window.installPWA = function () {
        if (!deferredPrompt) {
            console.log('[PWA] No install prompt available (already installed or not supported)');
            return Promise.resolve({ outcome: 'dismissed' });
        }
        return deferredPrompt.prompt().then(function () {
            return deferredPrompt.userChoice.then(function (choiceResult) {
                deferredPrompt = null;
                return choiceResult;
            });
        });
    };

    // Report install result when app is launched standalone
    window.addEventListener('appinstalled', function (e) {
        console.log('[PWA] App installed:', e);
        deferredPrompt = null;
    });

    window.isPWAInstalled = function () {
        return window.matchMedia('(display-mode: standalone)').matches ||
            navigator.standalone === true;
    };
})();
