/**
 * navbar-init.js
 * Centralized logic for Navbar and Sidebar interactivity across dashboard pages.
 * Handles profile dropdowns, mobile sidebar toggles, and user info population.
 */
(function() {
    'use strict';

    function initNavbar() {
        const elements = {
            toggle: document.getElementById('sidebarToggle') || document.getElementById('vm_sidebarToggle'),
            close: document.getElementById('sidebarClose') || document.getElementById('vm_sidebarClose'),
            sidebar: document.getElementById('appSidebar') || document.getElementById('vm_appSidebar'),
            backdrop: document.getElementById('sidebarBackdrop') || document.getElementById('vm_sidebarBackdrop'),
            menuBtn: document.getElementById('userMenuButton'),
            menu: document.getElementById('userMenu'),
            userName: document.getElementById('navUserName'),
            planLabel: document.getElementById('navPlanLabel'),
            initials: document.getElementById('userInitials'),
            avatar: document.getElementById('summaryAvatar')
        };

        // --- Sidebar Toggles ---
        function openSidebar() {
            if (window.VevahaMobile && window.VevahaMobile.openSidebar) {
                window.VevahaMobile.openSidebar();
                return;
            }
            if (elements.sidebar) {
                elements.sidebar.style.setProperty('transform', 'translateX(0)', 'important');
                elements.sidebar.classList.add('open');
                elements.sidebar.dataset.open = 'true';
                elements.sidebar.classList.remove('-translate-x-full');
                elements.sidebar.setAttribute('aria-hidden', 'false');
                document.body.classList.add('vm-sidebar-open', 'mobile-sidebar-open');
            }
            if (elements.backdrop) {
                elements.backdrop.classList.remove('hidden');
                elements.backdrop.classList.add('open');
                elements.backdrop.style.setProperty('display', 'block', 'important');
            }
        }

        function closeSidebar() {
            if (window.VevahaMobile && window.VevahaMobile.closeSidebar) {
                window.VevahaMobile.closeSidebar();
                return;
            }
            if (window.innerWidth < 768 && elements.sidebar) {
                elements.sidebar.style.setProperty('transform', 'translateX(-100%)', 'important');
                elements.sidebar.classList.remove('open');
                elements.sidebar.dataset.open = 'false';
                elements.sidebar.classList.add('-translate-x-full');
                elements.sidebar.setAttribute('aria-hidden', 'true');
                document.body.classList.remove('vm-sidebar-open', 'mobile-sidebar-open');
            }
            if (elements.backdrop) {
                elements.backdrop.classList.add('hidden');
                elements.backdrop.classList.remove('open');
                elements.backdrop.style.setProperty('display', 'none', 'important');
            }
        }

        // Only attach if mobile-ux hasn't already bound it
        if (elements.toggle && !elements.toggle._vmBound) {
            elements.toggle._vmBound = true;
            elements.toggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (window.VevahaMobile && window.VevahaMobile.toggleSidebar) {
                    window.VevahaMobile.toggleSidebar();
                } else {
                    const isOpen = elements.sidebar && (elements.sidebar.classList.contains('open') || elements.sidebar.dataset.open === 'true');
                    isOpen ? closeSidebar() : openSidebar();
                }
            });
        }
        if (elements.close && !elements.close._vmBound) {
            elements.close._vmBound = true;
            elements.close.addEventListener('click', (e) => { e.preventDefault(); closeSidebar(); });
        }
        if (elements.backdrop && !elements.backdrop._vmBound) {
            elements.backdrop._vmBound = true;
            elements.backdrop.addEventListener('click', closeSidebar);
        }
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSidebar(); });
        if (elements.sidebar) elements.sidebar.querySelectorAll('a').forEach(a => a.addEventListener('click', () => { if (innerWidth < 768) closeSidebar(); }));

        // --- User Menu Dropdown ---
        if (elements.menuBtn && elements.menu) {
            elements.menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                elements.menu.classList.toggle('hidden');
            });
            document.addEventListener('click', () => {
                if (elements.menu) elements.menu.classList.add('hidden');
            });
        }

        // --- Populate User Data ---
        function populateUI() {
            try {
                // Try different common keys used in the app
                const stored = localStorage.getItem('userData') || localStorage.getItem('vm_user') || '{}';
                const user = JSON.parse(stored);
                
                if (user && (user.full_name || user.name || user.email)) {
                    const name = user.full_name || user.name || 'Member';
                    const plan = (user.plan_name || 'Free').toUpperCase();
                    const photo = user.profile_picture_url;

                    if (elements.userName) elements.userName.textContent = name;
                    if (elements.planLabel) elements.planLabel.textContent = plan + ' PLAN';
                    
                    if (elements.initials) {
                        if (photo) {
                            elements.initials.innerHTML = `<img src="${photo}" class="w-full h-full rounded-full object-cover">`;
                            elements.initials.classList.remove('bg-gradient-to-r', 'from-pink-500', 'to-pink-600');
                        } else {
                            elements.initials.textContent = name.split(' ')
                                .map(w => w[0] || '')
                                .join('')
                                .substring(0, 2)
                                .toUpperCase() || 'VM';
                        }
                    }

                    if (elements.avatar && photo) {
                        elements.avatar.src = photo;
                    }
                }
            } catch (e) {
                console.warn('[Navbar] Failed to populate user data:', e);
            }
        }

        // Run population
        populateUI();

        // Check if syncProfile is available on home.html or similar, and listen for updates
        window.addEventListener('profileSynced', populateUI);

        // --- Handle window resize ---
        window.addEventListener('resize', () => {
            if (window.innerWidth >= 768 && elements.sidebar) {
                elements.sidebar.style.transform = 'translateX(0)';
                elements.sidebar.classList.remove('-translate-x-full');
            } else if (elements.sidebar) {
                elements.sidebar.style.transform = 'translateX(-100%)';
                elements.sidebar.classList.add('-translate-x-full');
            }
        });
        
        // Ensure sidebar state is correct on load based on screen size
        if (window.innerWidth >= 768 && elements.sidebar) {
            elements.sidebar.style.transform = 'translateX(0)';
            elements.sidebar.classList.remove('-translate-x-full');
        }
    }

    // Global Logout Handler for all dashboard pages
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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNavbar);
    } else {
        initNavbar();
    }
})();
