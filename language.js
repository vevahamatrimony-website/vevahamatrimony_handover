/**
 * language.js
 * VevahaMatrimony Global Language & Translation Synchronizer
 * Pre-synchronizes cookies synchronously before page scripts execute
 * to guarantee 100% persistent translation across navigation and reloads.
 */
(function () {
    'use strict';

    // Synchronously ensure googtrans cookie matches localStorage before anything else runs
    function syncLanguageCookie() {
        try {
            const savedLang = localStorage.getItem('vm_lang') || 'en';
            const val = (savedLang === 'ta') ? '/en/ta' : '/en/en';
            const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
            const host = window.location.hostname;

            // 1. Host-only cookie at root path
            document.cookie = `googtrans=${val}; path=/; expires=${expires}; max-age=31536000; SameSite=Lax`;

            // 2. Domain-wide cookie for production subdomains
            if (host && !/^[0-9.]+$/.test(host) && host !== 'localhost') {
                const parts = host.split('.');
                if (parts.length >= 2) {
                    const rootDomain = '.' + parts.slice(-2).join('.');
                    document.cookie = `googtrans=${val}; path=/; domain=${rootDomain}; expires=${expires}; max-age=31536000; SameSite=Lax`;
                    document.cookie = `googtrans=${val}; path=/; domain=.${host}; expires=${expires}; max-age=31536000; SameSite=Lax`;
                }
            }
        } catch (e) {
            // Ignore security restrictions in sandboxed iframes
        }
    }

    // Run immediately
    syncLanguageCookie();

    // Global helper functions
    window.switchLanguage = function (lang) {
        if (window.vmSetLanguage) {
            window.vmSetLanguage(lang);
        }
    };

    window.getCurrentLanguage = function () {
        return localStorage.getItem('vm_lang') || 'en';
    };

    // Load translate-widget.js automatically if not already present
    if (!document.querySelector('script[src*="translate-widget.js"]') && !document.getElementById('vm-translate-widget')) {
        const s = document.createElement('script');
        s.src = 'translate-widget.js';
        document.head.appendChild(s);
    }
})();
