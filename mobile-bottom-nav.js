/**
 * mobile-bottom-nav.js
 * Injects a mobile-friendly bottom navigation bar on logged-in pages.
 * Only visible on screens ≤ 767px (controlled by CSS in style.css).
 */
(function () {
    // Only inject on logged-in pages (pages with #appSidebar or auth-guard)
    const isLoggedInPage = document.getElementById('appSidebar') !== null ||
        document.querySelector('[data-logged-in]') !== null;

    if (!isLoggedInPage) return;

    // Determine current page for active state
    const currentPath = window.location.pathname.split('/').pop() || 'home.html';

    const navItems = [
        { href: 'home.html',                icon: 'fa-home',        label: 'Home',     match: ['home.html'] },
        { href: 'active-members-dash.html', icon: 'fa-users',       label: 'Active',   match: ['active-members-dash.html'] },
        { href: 'messages.html', icon: 'fa-comments',    label: 'Chat',     match: ['messages.html'], badgeId: 'mobileNavMsgBadge' },
        { href: 'requests.html', icon: 'fa-handshake',   label: 'Requests', match: ['requests.html', 'interested-profiles.html'], badgeId: 'mobileNavReqBadge' },
        { href: 'profile.html',  icon: 'fa-user-circle', label: 'Profile',  match: ['profile.html', 'account-settings.html', 'settings.html'] },
    ];

    // Build the HTML
    const nav = document.createElement('nav');
    nav.className = 'mobile-bottom-nav';
    nav.id = 'mobileBottomNav';
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
            <i class="fas ${item.icon}"></i>
            <span>${item.label}</span>
            ${item.badgeId ? `<span class="nav-badge hidden" id="${item.badgeId}"></span>` : ''}
        `;
        itemsWrapper.appendChild(el);
    });

    nav.appendChild(itemsWrapper);
    document.body.appendChild(nav);

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
