/**
 * mobile-bottom-nav.js
 * Injects a modern app-style bottom navigation bar on all logged-in pages.
 * Only visible on screens <= 767px (controlled by CSS in style.css).
 */
(function () {
    if (document.getElementById('mobileBottomNav')) return;

    const loggedInPages = [
        'home.html', 'messages.html', 'active-members-dash.html', 'requests.html',
        'interested-profiles.html', 'connections.html', 'account-settings.html',
        'settings.html', 'billing.html', 'profile.html', 'matches.html',
        'horoscopic-chatbot.html', 'edit-profile.html', 'search-results.html'
    ];

    const currentPath = window.location.pathname.split('/').pop() || 'home.html';
    const isKnownLoggedInPage = loggedInPages.includes(currentPath);
    const isLoggedInPage = isKnownLoggedInPage ||
        document.getElementById('appSidebar') !== null ||
        document.getElementById('sidebarToggle') !== null ||
        document.querySelector('[data-logged-in]') !== null ||
        (window.VMAuth && window.VMAuth.isLoggedIn && window.VMAuth.isLoggedIn()) ||
        !!localStorage.getItem('vm_token');

    if (!isLoggedInPage) return;

    const navItems = [
        { href: 'home.html',                icon: 'fa-home',        label: 'Home',     match: ['home.html'] },
        { href: 'active-members-dash.html', icon: 'fa-users',       label: 'Active',   match: ['active-members-dash.html', 'matches.html'] },
        { href: 'messages.html',            icon: 'fa-comments',    label: 'Chat',     match: ['messages.html'], badgeId: 'mobileNavMsgBadge' },
        { href: 'requests.html',            icon: 'fa-handshake',   label: 'Requests', match: ['requests.html', 'interested-profiles.html', 'connections.html'], badgeId: 'mobileNavReqBadge' },
        { href: 'profile.html',             icon: 'fa-user-circle', label: 'Profile',  match: ['profile.html', 'account-settings.html', 'settings.html', 'billing.html', 'edit-profile.html'] },
    ];

    function createNav() {
        if (document.getElementById('mobileBottomNav')) return;

        const nav = document.createElement('nav');
        nav.className = 'mobile-bottom-nav';
        nav.id = 'mobileBottomNav';
        nav.style.setProperty('top', 'auto', 'important');
        nav.style.setProperty('bottom', '0', 'important');
        nav.setAttribute('role', 'navigation');
        nav.setAttribute('aria-label', 'Mobile bottom navigation');

        const itemsWrapper = document.createElement('div');
        itemsWrapper.className = 'mobile-bottom-nav-items';

        navItems.forEach(item => {
            const isActive = item.match.some(m => currentPath === m || currentPath.includes(m.replace('.html', '')));
            const el = document.createElement('a');
            el.href = item.href;
            el.className = 'mobile-bottom-nav-item' + (isActive ? ' active' : '');
            el.setAttribute('aria-label', item.label);
            el.innerHTML = `
                <div class="nav-icon-wrap">
                    <i class="fas ${item.icon}"></i>
                    ${item.badgeId ? `<span class="nav-badge hidden" id="${item.badgeId}"></span>` : ''}
                </div>
                <span>${item.label}</span>
            `;
            itemsWrapper.appendChild(el);
        });

        nav.appendChild(itemsWrapper);
        document.body.appendChild(nav);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createNav);
    } else {
        createNav();
    }

    // Listen for badge update events dispatched by other scripts
    window.addEventListener('mobileNavBadge', function (e) {
        const { id, count } = e.detail || {};
        if (!id) return;
        const badge = document.getElementById(id);
        if (!badge) return;
        if (count && count > 0) {
            badge.textContent = count > 99 ? '99+' : String(count);
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    });
})();
