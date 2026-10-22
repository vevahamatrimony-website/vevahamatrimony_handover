/**
 * navbar-sidebar.js
 * Injects the shared VevahaMatrimony top nav + sidebar into any post-login page.
 *
 * Usage — add to <body>:
 *   data-active-nav="matches"   (matches | messages | connections | interested | requests | astro | settings)
 *
 * Then include this script:
 *   <script src="navbar-sidebar.js"></script>
 */
(function () {
    'use strict';

    // ── Sidebar nav links definition ─────────────────────────────────────────
    const NAV_LINKS = [
        { key: 'home',        href: 'home.html',               icon: 'fa-home',         label: 'Home' },
        { key: 'matches',     href: 'matches.html',            icon: 'fa-heart',        label: 'Matches' },
        { key: 'active-members', href: 'active-members-dash.html', icon: 'fa-users', label: 'Active Members' },
        { key: 'messages',    href: 'messages.html',           icon: 'fa-comments',     label: 'Messages' },
        { key: 'interested',  href: 'interested-profiles.html',icon: 'fa-star',         label: 'Interested' },
        { key: 'requests',    href: 'requests.html',           icon: 'fa-handshake',    label: 'Requests' },
        { key: 'astro',       href: 'horoscopic-chatbot.html', icon: 'fa-moon',         label: 'Astro AI' },
        { key: 'connections', href: 'connections.html',        icon: 'fa-user-friends', label: 'My Connections' },
        { key: 'edit-profile',href: 'account-settings.html',   icon: 'fa-user-edit',    label: 'Edit Profile' },
        { key: 'settings',    href: 'settings.html',           icon: 'fa-user-cog',     label: 'Settings' },
    ];

    // ── Shared CSS ────────────────────────────────────────────────────────────
    const CSS = `
        .vm-sidebar-link {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem 1rem;
            border-radius: 0.75rem;
            color: #475569;
            font-weight: 500;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
            text-decoration: none;
        }
        .vm-sidebar-link::before {
            content: '';
            position: absolute;
            left: 0; top: 0;
            height: 100%; width: 3px;
            background: linear-gradient(180deg, #ec4899, #db2777);
            transform: scaleY(0);
            transition: transform 0.3s;
        }
        .vm-sidebar-link:hover::before,
        .vm-sidebar-link.active::before { transform: scaleY(1); }
        .vm-sidebar-link i { color: inherit; transition: transform 0.3s; }
        .vm-sidebar-link:hover {
            background: linear-gradient(90deg, #fdf2f8 0%, transparent 100%);
            color: #db2777;
            transform: translateX(5px);
        }
        .vm-sidebar-link:hover i { transform: scale(1.2); }
        .vm-sidebar-link.active {
            background: linear-gradient(90deg, #fdf2f8 0%, #fce7f3 100%);
            color: #db2777;
            font-weight: 600;
            box-shadow: 0 4px 15px rgba(236,72,153,0.1);
        }
        body { font-family: 'Poppins', sans-serif; }
        #vm_mainContent { flex: 1; margin-left: 0; padding: 2rem 1rem; padding-top: 5rem; }
        @media (min-width: 768px) { #vm_mainContent { margin-left: 15rem; padding: 2rem 2.5rem; padding-top: 5rem; } }
    `;

    // ── Build nav HTML ────────────────────────────────────────────────────────
    function buildNav() {
        return `
        <nav id="vm_topNav" style="position:fixed;top:0;left:0;right:0;z-index:50;background:#fff;border-bottom:1px solid #f3f4f6;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
            <div style="max-width:80rem;margin:0 auto;padding:0 1rem;height:4rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;">
                <!-- Logo + hamburger -->
                <div style="display:flex;align-items:center;gap:0.75rem;">
                    <button id="vm_sidebarToggle" style="display:none;background:none;border:none;cursor:pointer;color:#475569;font-size:1.25rem;" aria-label="Open navigation">
                        <i class="fas fa-bars"></i>
                    </button>
                    <a href="home.html" style="display:flex;align-items:center;gap:0.5rem;font-size:1.1rem;font-weight:700;color:#db2777;text-decoration:none;">
                        <img src="/images/vevaha-logo.png" alt="Vevaha" style="width:2.2rem;height:2.2rem;border-radius:50%;">
                        VevahaMatrimony
                    </a>
                </div>
                <!-- Search -->
                <div style="position:relative;flex:1;max-width:18rem;display:none;" id="vm_searchWrap">
                    <input type="text" id="searchInput" placeholder="Search..."
                        style="width:100%;background:#f1f5f9;border:none;border-radius:9999px;padding:0.5rem 1rem 0.5rem 2.5rem;font-size:0.875rem;outline:none;"
                        onfocus="if(window.showSearchSuggestions)showSearchSuggestions();"
                        onblur="if(window.hideSearchSuggestions)hideSearchSuggestions();"
                        onkeypress="if(window.handleSearchKeyPress)handleSearchKeyPress(event);">
                    <i class="fas fa-search" style="position:absolute;left:0.75rem;top:50%;transform:translateY(-50%);color:#9ca3af;font-size:0.875rem;"></i>
                </div>
                <!-- Right controls -->
                <div style="display:flex;align-items:center;gap:0.75rem;">
                    <!-- Online toggle -->
                    <div style="display:flex;align-items:center;gap:0.5rem;padding:0.4rem 0.75rem;background:#f9fafb;border:1px solid #e5e7eb;border-radius:0.5rem;">
                        <span id="onlineStatusBadge" style="font-size:0.75rem;font-weight:600;">Online</span>
                        <button id="onlineToggleBtn" onclick="if(window.handleOnlineToggleClick)handleOnlineToggleClick();"
                            style="position:relative;width:2.75rem;height:1.5rem;border-radius:9999px;border:none;cursor:pointer;background:#22c55e;transition:background 0.2s;">
                            <span id="toggleSlider" style="position:absolute;top:2px;left:2px;width:1.25rem;height:1.25rem;background:#fff;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.2);transition:left 0.2s;"></span>
                        </button>
                    </div>
                    <!-- User menu -->
                    <div style="position:relative;">
                        <button id="userMenuButton"
                            style="display:flex;align-items:center;gap:0.6rem;padding:0.4rem 0.75rem;border:1px solid #e5e7eb;border-radius:9999px;background:#fff;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
                            <div id="userInitials" style="width:2.25rem;height:2.25rem;border-radius:50%;background:linear-gradient(135deg,#ec4899,#db2777);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.85rem;">VM</div>
                            <div style="text-align:left;display:none;" id="vm_userNameBlock">
                                <p id="navUserName" style="font-size:0.8rem;font-weight:600;color:#111827;margin:0;">Member</p>
                                <p id="navPlanLabel" style="font-size:0.7rem;color:#6b7280;margin:0;">Free Plan</p>
                            </div>
                            <i class="fas fa-chevron-down" style="font-size:0.65rem;color:#6b7280;"></i>
                        </button>
                        <div id="userMenu" style="display:none;position:absolute;right:0;top:calc(100% + 0.5rem);width:14rem;background:#fff;border-radius:1rem;box-shadow:0 10px 40px rgba(0,0,0,0.12);border:1px solid #f3f4f6;overflow:hidden;z-index:60;">
                            <a href="profile.html" style="display:flex;align-items:center;padding:0.75rem 1rem;font-size:0.875rem;color:#374151;text-decoration:none;" onmouseover="this.style.background='#fdf2f8'" onmouseout="this.style.background=''"><i class="fas fa-id-badge" style="color:#ec4899;margin-right:0.75rem;"></i>Profile</a>
                            <a href="settings.html" style="display:flex;align-items:center;padding:0.75rem 1rem;font-size:0.875rem;color:#374151;text-decoration:none;" onmouseover="this.style.background='#fdf2f8'" onmouseout="this.style.background=''"><i class="fas fa-sliders" style="color:#ec4899;margin-right:0.75rem;"></i>Settings</a>
                            <button onclick="if(window.handleLogout)handleLogout();" style="width:100%;text-align:left;display:flex;align-items:center;padding:0.75rem 1rem;font-size:0.875rem;color:#374151;background:none;border:none;cursor:pointer;" onmouseover="this.style.background='#fdf2f8'" onmouseout="this.style.background=''"><i class="fas fa-arrow-right-from-bracket" style="color:#ec4899;margin-right:0.75rem;"></i>Logout</button>
                        </div>
                    </div>
                </div>
            </div>
        </nav>`;
    }

    // ── Build sidebar HTML ────────────────────────────────────────────────────
    function buildSidebar(activeKey) {
        const links = NAV_LINKS.map(l => {
            const isActive = l.key === activeKey;
            return `<a href="${l.href}" class="vm-sidebar-link${isActive ? ' active' : ''}"><i class="fas ${l.icon}"></i><span>${l.label}</span></a>`;
        }).join('');

        return `
        <aside id="vm_appSidebar"
            style="position:fixed;top:4rem;left:0;bottom:0;width:15rem;background:#fff;border-right:1px solid #f3f4f6;z-index:40;overflow-y:auto;transform:translateX(-100%);transition:transform 0.3s;">
            <!-- Mobile close button -->
            <div style="display:flex;align-items:center;justify-content:space-between;padding:1rem;border-bottom:1px solid #f3f4f6;">
                <span style="font-size:0.875rem;font-weight:600;color:#374151;">Navigation</span>
                <button id="vm_sidebarClose" style="background:none;border:none;cursor:pointer;color:#475569;font-size:1.1rem;" aria-label="Close navigation"><i class="fas fa-times"></i></button>
            </div>
            <div style="padding:1.25rem 1rem;display:flex;flex-direction:column;gap:0.25rem;">
                ${links}
            </div>
        </aside>
        <div id="vm_sidebarBackdrop" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:30;" ></div>`;
    }

    // ── Inject CSS ────────────────────────────────────────────────────────────
    function injectCSS() {
        if (document.getElementById('vm_navCSS')) return;
        const s = document.createElement('style');
        s.id = 'vm_navCSS';
        s.textContent = CSS;
        document.head.appendChild(s);
    }

    // ── Remove existing footer ────────────────────────────────────────────────
    function removeFooters() {
        document.querySelectorAll('footer').forEach(f => f.remove());
    }

    // ── Wrap existing content ─────────────────────────────────────────────────
    function wrapContent() {
        // If there's already a <main>, just restyle it
        const existingMain = document.querySelector('main');
        if (existingMain) {
            existingMain.id = existingMain.id || 'vm_mainContent';
            if (!existingMain.id) existingMain.id = 'vm_mainContent';
            existingMain.style.flex = '1';
            existingMain.style.marginLeft = '0';
            existingMain.style.paddingTop = '5rem';
            existingMain.style.minHeight = '100vh';
            // Apply via class-based CSS instead
            existingMain.classList.add('vm-page-main');
            return;
        }
        // Otherwise wrap all direct body children that aren't nav/aside/backdrop into a <main>
        const main = document.createElement('main');
        main.id = 'vm_mainContent';
        const toMove = Array.from(document.body.children).filter(el =>
            !['vm_topNav','vm_appSidebar','vm_sidebarBackdrop','vm_navCSS'].includes(el.id) &&
            el.tagName !== 'NAV' && el.tagName !== 'ASIDE' && el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE'
        );
        toMove.forEach(el => main.appendChild(el));
        document.body.appendChild(main);
    }

    // ── Populate user info ────────────────────────────────────────────────────
    function populateUser() {
        try {
            const raw = localStorage.getItem('userData') || localStorage.getItem('vm_user') || '{}';
            const user = JSON.parse(raw);
            const name = user.full_name || user.name || 'Member';
            const plan = (user.plan_name || 'Free').toUpperCase() + ' PLAN';
            const initials = name.split(' ').map(w => w[0] || '').join('').substring(0,2).toUpperCase() || 'VM';

            const el = id => document.getElementById(id);
            if (el('navUserName'))  el('navUserName').textContent  = name;
            if (el('navPlanLabel')) el('navPlanLabel').textContent = plan;
            if (el('userInitials')) el('userInitials').textContent = initials;

            // Show name block on md+
            const nb = el('vm_userNameBlock');
            if (nb) nb.style.display = '';
            // Show search on md+
            const sw = el('vm_searchWrap');
            if (sw) sw.style.display = '';
            // Show hamburger on mobile
            const hm = el('vm_sidebarToggle');
            if (hm) hm.style.display = '';
        } catch (_) {}
    }

    // ── Wire up desktop sidebar (always visible on md+) ───────────────────────
    function applyResponsive() {
        const sidebar  = document.getElementById('vm_appSidebar');
        const backdrop = document.getElementById('vm_sidebarBackdrop');
        const toggle   = document.getElementById('vm_sidebarToggle');
        const close    = document.getElementById('vm_sidebarClose');
        const menu     = document.getElementById('userMenu');
        const menuBtn  = document.getElementById('userMenuButton');

        function isMd() { return window.innerWidth >= 768; }

        function updateLayout() {
            if (!sidebar) return;
            if (isMd()) {
                sidebar.style.transform = 'translateX(0)';
                if (backdrop) backdrop.style.display = 'none';
            } else {
                sidebar.style.transform = 'translateX(-100%)';
            }
        }

        function openSidebar() {
            if (!sidebar) return;
            sidebar.style.transform = 'translateX(0)';
            if (backdrop) backdrop.style.display = 'block';
        }

        function closeSidebar() {
            if (isMd()) return;
            if (sidebar) sidebar.style.transform = 'translateX(-100%)';
            if (backdrop) backdrop.style.display = 'none';
        }

        if (toggle) toggle.addEventListener('click', openSidebar);
        if (close)  close.addEventListener('click',  closeSidebar);
        if (backdrop) backdrop.addEventListener('click', closeSidebar);

        // User menu toggle
        if (menuBtn && menu) {
            menuBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
            });
            document.addEventListener('click', function () { menu.style.display = 'none'; });
        }

        updateLayout();
        window.addEventListener('resize', updateLayout);
    }

    // ── Main init ─────────────────────────────────────────────────────────────
    function init() {
        const activeKey = document.body.dataset.activeNav || 'home';

        injectCSS();

        // Remove existing nav/aside/footer before injecting ours
        document.querySelectorAll('nav:not(#vm_topNav), aside:not(#vm_appSidebar), footer').forEach(el => el.remove());

        // Inject nav + sidebar at top of body
        const container = document.createElement('div');
        container.innerHTML = buildNav() + buildSidebar(activeKey);
        // Prepend all child nodes
        Array.from(container.childNodes).reverse().forEach(node => {
            document.body.insertBefore(node, document.body.firstChild);
        });

        wrapContent();
        populateUser();
        applyResponsive();
    }

    // Global Logout Handler for navbar-sidebar pages
    window.handleLogout = function() {
        if (confirm('Are you sure you want to log out?')) {
            // Clear standard auth keys
            localStorage.removeItem('vm_token');
            localStorage.removeItem('vm_refresh');
            localStorage.removeItem('userData');
            localStorage.removeItem('userSession');
            localStorage.removeItem('userLoggedIn');
            localStorage.removeItem('profilePic');
            localStorage.removeItem('selectedPlan');
            localStorage.removeItem('selectedMembershipPlan');
            
            // Clear sessionStorage
            sessionStorage.clear();
            
            // Redirect
            window.location.href = 'login.html';
        }
    };

    // Run after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
