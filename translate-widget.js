/**
 * translate-widget.js
 * VevahaMatrimony Custom Translate Widget
 * Displays a clean translate floating button.
 * Clicking opens a custom popup with English (🇬🇧) and Tamil (🇮🇳 தமிழ்) choices.
 * Absolutely NO default Google arrows, banners, boxes, or legacy icons.
 * Persistent across all pages, reloads, and navigations.
 */
(function () {
    'use strict';

    // Prevent duplicate widget initialization
    if (window.__vmTranslateInitialized) return;
    window.__vmTranslateInitialized = true;

    // Helper: Set googtrans cookie with 1-year persistence across all domain variations
    function setGoogtransCookie(lang) {
        try {
            const val = (lang === 'ta') ? '/en/ta' : '/en/en';
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
            console.warn('Cookie sync warning:', e);
        }
    }

    // Sync cookie immediately
    const initialLang = localStorage.getItem('vm_lang') || 'en';
    setGoogtransCookie(initialLang);

    // Inject styles: hide all Google default artifacts & style new custom widget
    const style = document.createElement('style');
    style.id = 'vm-translate-style';
    style.textContent = `
        /* Hide all default Google Translate top frames, banners, popups, and tooltips */
        .goog-te-banner-frame,
        .goog-te-balloon-frame,
        #goog-gt-tt,
        .goog-te-spinner-pos,
        .goog-tooltip,
        .goog-tooltip:hover,
        .skiptranslate > iframe {
            display: none !important;
            visibility: hidden !important;
        }
        body {
            top: 0px !important;
            position: static !important;
        }
        /* Completely suppress and hide any Google gadget elements */
        .goog-te-gadget,
        .goog-te-combo,
        .goog-logo-link {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
            width: 0 !important;
            height: 0 !important;
            overflow: hidden !important;
            position: absolute !important;
            left: -9999px !important;
        }
        /* Custom Translate Widget Styles */
        #vm-translate-widget {
            position: fixed;
            bottom: 120px;
            right: 20px;
            z-index: 99999;
            font-family: 'Poppins', sans-serif;
            margin: 0;
            padding: 0;
        }
        #vm-translate-btn {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
            color: #ffffff;
            border: 2px solid #ffffff;
            box-shadow: 0 4px 20px rgba(219, 39, 119, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            outline: none;
            padding: 0;
            appearance: none;
            -webkit-appearance: none;
        }
        #vm-translate-btn:hover {
            transform: scale(1.08);
            box-shadow: 0 6px 24px rgba(219, 39, 119, 0.5);
        }
        #vm-translate-btn i {
            font-size: 22px;
            color: #ffffff;
        }
        #vm-translate-menu {
            display: none;
            position: absolute;
            bottom: 58px;
            right: 0;
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
            border: 1px solid #fbcfe8;
            padding: 8px;
            min-width: 150px;
            flex-direction: column;
            gap: 4px;
            z-index: 100000;
            animation: vmFadeInUp 0.2s ease-out forwards;
        }
        #vm-translate-menu.show {
            display: flex;
        }
        @keyframes vmFadeInUp {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        .vm-lang-option {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 14px;
            border-radius: 10px;
            border: none;
            background: transparent;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            color: #374151;
            width: 100%;
            text-align: left;
            transition: background 0.2s ease, color 0.2s ease;
            outline: none;
            appearance: none;
            -webkit-appearance: none;
        }
        .vm-lang-option:hover {
            background: #fdf2f8;
            color: #db2777;
        }
        .vm-lang-option.active {
            background: #fce7f3;
            color: #db2777;
            font-weight: 700;
        }
        @media (max-width: 640px) {
            #vm-translate-widget {
                bottom: 95px;
                right: 16px;
            }
            #vm-translate-btn {
                width: 44px;
                height: 44px;
            }
            #vm-translate-btn i {
                font-size: 20px;
            }
        }
    `;
    document.head.appendChild(style);

    // Build the Widget DOM
    function setupWidgetDOM() {
        if (!document.body) return;

        // Ensure a strictly invisible, headless mount point for Google Translate
        let mount = document.getElementById('google_translate_element');
        if (!mount) {
            mount = document.createElement('div');
            mount.id = 'google_translate_element';
            document.body.appendChild(mount);
        }
        // Force the mount point to be completely non-visual and off-screen
        mount.removeAttribute('class');
        mount.style.cssText = 'position:absolute !important; top:-9999px !important; left:-9999px !important; width:1px !important; height:1px !important; opacity:0 !important; pointer-events:none !important; visibility:hidden !important; margin:0 !important; padding:0 !important; border:none !important; background:none !important; box-shadow:none !important;';
        mount.setAttribute('aria-hidden', 'true');

        // Create the single floating widget if not already present
        if (!document.getElementById('vm-translate-widget')) {
            const widget = document.createElement('div');
            widget.id = 'vm-translate-widget';
            widget.innerHTML = `
                <button id="vm-translate-btn" type="button" aria-label="Language Translator" title="Translate Page">
                    <i class="fas fa-language"></i>
                </button>
                <div id="vm-translate-menu" role="menu">
                    <button type="button" class="vm-lang-option" id="vm-lang-en" onclick="window.vmSetLanguage('en')">
                        <span style="font-size: 18px;">🇬🇧</span>
                        <span>English</span>
                    </button>
                    <button type="button" class="vm-lang-option" id="vm-lang-ta" onclick="window.vmSetLanguage('ta')">
                        <span style="font-size: 18px;">🇮🇳</span>
                        <span>தமிழ்</span>
                    </button>
                </div>
            `;
            document.body.appendChild(widget);

            const btn = document.getElementById('vm-translate-btn');
            const menu = document.getElementById('vm-translate-menu');

            if (btn && menu) {
                btn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    menu.classList.toggle('show');
                });

                document.addEventListener('click', function (e) {
                    if (!widget.contains(e.target)) {
                        menu.classList.remove('show');
                    }
                });
            }
        }

        // Highlight active saved language
        const currentLang = localStorage.getItem('vm_lang') || 'en';
        updateActiveOption(currentLang);
    }

    function updateActiveOption(lang) {
        document.querySelectorAll('.vm-lang-option').forEach(el => el.classList.remove('active'));
        const target = document.getElementById(`vm-lang-${lang}`);
        if (target) target.classList.add('active');
    }

    // Synchronize Google Translate's hidden select combo box
    function syncGoogleCombo(targetLang) {
        const select = document.querySelector('.goog-te-combo');
        if (!select) return false;
        if (select.value !== targetLang) {
            select.value = targetLang;
            select.dispatchEvent(new Event('change'));
        }
        return true;
    }

    // Active synchronization watcher
    function startSyncWatcher() {
        const targetLang = localStorage.getItem('vm_lang') || 'en';
        if (targetLang === 'en') return;

        let count = 0;
        const interval = setInterval(function () {
            count++;
            const synced = syncGoogleCombo(targetLang);
            if (synced || count > 35) {
                clearInterval(interval);
            }
        }, 100);
    }

    // Global function to change language
    window.vmSetLanguage = function (langCode) {
        const prevLang = localStorage.getItem('vm_lang') || 'en';
        localStorage.setItem('vm_lang', langCode);
        setGoogtransCookie(langCode);
        updateActiveOption(langCode);

        const menu = document.getElementById('vm-translate-menu');
        if (menu) menu.classList.remove('show');

        // If clicking the language that is already active, simply close menu
        if (prevLang === langCode) return;

        const select = document.querySelector('.goog-te-combo');
        if (select) {
            select.value = langCode;
            select.dispatchEvent(new Event('change'));

            // When switching back to English, reload page cleanly to restore original text
            if (langCode === 'en') {
                setTimeout(function () {
                    window.location.reload();
                }, 200);
            }
        } else {
            // If Google Translate isn't ready yet, reload so it boots directly with the new cookie
            window.location.reload();
        }

        // Notify any listeners
        try {
            window.dispatchEvent(new CustomEvent('vm_language_changed', { detail: { lang: langCode } }));
        } catch (e) {}
    };

    // Google Translate Initialization Callback
    window.googleTranslateElementInit = function () {
        try {
            new window.google.translate.TranslateElement({
                pageLanguage: 'en',
                includedLanguages: 'ta,en',
                autoDisplay: false
            }, 'google_translate_element');
        } catch (e) {
            console.warn('Google Translate initialization error:', e);
        }

        // Apply saved language as soon as combo is mounted
        startSyncWatcher();
    };

    // Load Google Translate script dynamically once
    function loadGoogleTranslateScript() {
        if (!document.querySelector('script[src*="translate.google.com"]')) {
            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
            script.async = true;
            document.head.appendChild(script);
        } else if (window.google && window.google.translate) {
            window.googleTranslateElementInit();
        }
    }

    // Cross-tab synchronization
    window.addEventListener('storage', function (e) {
        if (e.key === 'vm_lang' && e.newValue) {
            setGoogtransCookie(e.newValue);
            updateActiveOption(e.newValue);
            syncGoogleCombo(e.newValue);
        }
    });

    // Handle bfcache (browser back/forward navigation)
    window.addEventListener('pageshow', function () {
        const savedLang = localStorage.getItem('vm_lang') || 'en';
        setGoogtransCookie(savedLang);
        updateActiveOption(savedLang);
        startSyncWatcher();
    });

    // Run initialization on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            setupWidgetDOM();
            loadGoogleTranslateScript();
        });
    } else {
        setupWidgetDOM();
        loadGoogleTranslateScript();
    }
})();
