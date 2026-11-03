/* VevahaMatrimony – robust mobile sidebar, navbar & UX
   Works seamlessly across both public pages and after-login pages. */
(function () {
  'use strict';

  function isMobile() { return window.innerWidth < 768; }

  // ---------------------------------------------------------------------
  // 1. PUBLIC PAGES: Mobile Dropdown Menu Handling
  // ---------------------------------------------------------------------
  function getMobileNavMenu() {
    return document.getElementById('mobile-nav-menu') ||
           document.getElementById('mobileMenu') ||
           document.getElementById('mobile-nav-menu-dash');
  }

  function getMobileMenuButtons() {
    return document.querySelectorAll('#mobile-menu-button, #mobile-menu-btn, #mobileMenuToggle, #mobile-menu-button-dash, [data-action="toggle-mobile-menu"]');
  }

  function openMobileMenu() {
    var menu = getMobileNavMenu();
    if (!menu) return;
    menu.classList.remove('hidden');
    menu.style.display = 'block';
    menu.setAttribute('aria-expanded', 'true');
    document.body.classList.add('mobile-menu-open');
    getMobileMenuButtons().forEach(function (btn) {
      btn.setAttribute('aria-expanded', 'true');
    });
  }

  function closeMobileMenu() {
    var menu = getMobileNavMenu();
    if (!menu) return;
    menu.classList.add('hidden');
    menu.style.display = 'none';
    menu.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('mobile-menu-open');
    getMobileMenuButtons().forEach(function (btn) {
      btn.setAttribute('aria-expanded', 'false');
    });
  }

  function toggleMobileMenu(e) {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    var menu = getMobileNavMenu();
    if (!menu) return;

    // Timestamp debounce: ignore accidental duplicate calls in the same touch/click event tick (<120ms)
    var now = Date.now();
    if (menu._lastToggleTime && (now - menu._lastToggleTime) < 120) {
      return;
    }
    menu._lastToggleTime = now;

    var isClosed = menu.classList.contains('hidden') || menu.style.display === 'none' || menu.offsetHeight === 0;
    if (isClosed) {
      openMobileMenu();
    } else {
      closeMobileMenu();
    }
  }

  // Expose toggleMobileMenu immediately to global window so inline onclick="toggleMobileMenu()" always works
  window.toggleMobileMenu = toggleMobileMenu;

  function initPublicNav() {
    var menu = getMobileNavMenu();
    var buttons = getMobileMenuButtons();

    buttons.forEach(function (btn) {
      if (btn._vmBound) return;
      btn._vmBound = true;
      btn.setAttribute('aria-controls', menu ? menu.id : 'mobile-nav-menu');
      btn.setAttribute('aria-expanded', 'false');

      btn.addEventListener('click', function (e) {
        // If the button already has an inline onclick, let it handle or skip double execution
        if (this.getAttribute('onclick')) return;
        toggleMobileMenu(e);
      });
    });

    if (menu && !menu._vmBound) {
      menu._vmBound = true;

      // Close when clicking any link inside the mobile menu
      menu.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () {
          if (isMobile()) closeMobileMenu();
        });
      });

      // Close when clicking outside of the menu and toggle buttons
      document.addEventListener('click', function (e) {
        if (!isMobile()) return;
        var isOpen = !menu.classList.contains('hidden') && menu.style.display !== 'none';
        if (!isOpen) return;

        var clickedInsideMenu = menu.contains(e.target);
        var clickedButton = false;
        buttons.forEach(function (btn) {
          if (btn.contains(e.target)) clickedButton = true;
        });

        if (!clickedInsideMenu && !clickedButton) {
          closeMobileMenu();
        }
      });
    }
  }

  // ---------------------------------------------------------------------
  // 2. AFTER-LOGIN PAGES: Mobile Sidebar Handling
  // ---------------------------------------------------------------------
  function getSidebar()  { return document.getElementById('appSidebar'); }
  function getBackdrop() { return document.getElementById('sidebarBackdrop'); }
  function getToggle()   { return document.getElementById('sidebarToggle'); }
  function getClose()    { return document.getElementById('sidebarClose'); }

  function openSidebar() {
    var s = getSidebar(), b = getBackdrop(), t = getToggle();
    if (!s) return;
    s.classList.remove('-translate-x-full');
    s.style.setProperty('transform', 'translateX(0)', 'important');
    s.classList.add('open');
    s.dataset.open = 'true';
    if (b) {
      b.classList.remove('hidden');
      b.classList.add('open');
      b.style.display = 'block';
    }
    document.body.classList.add('mobile-sidebar-open');
    document.body.style.overflow = 'hidden';
    if (t) t.setAttribute('aria-expanded', 'true');
  }

  function closeSidebar() {
    var s = getSidebar(), b = getBackdrop(), t = getToggle();
    if (!s) return;
    s.style.setProperty('transform', 'translateX(-100%)', 'important');
    s.classList.remove('open');
    s.dataset.open = 'false';
    if (b) {
      b.classList.add('hidden');
      b.classList.remove('open');
      b.style.display = 'none';
    }
    document.body.classList.remove('mobile-sidebar-open');
    document.body.style.overflow = '';
    if (t) t.setAttribute('aria-expanded', 'false');
  }

  function initAppSidebar() {
    var s = getSidebar(), t = getToggle(), c = getClose(), b = getBackdrop();
    if (!s || !t) return;
    if (t._vmBound) return; // idempotent
    t._vmBound = true;

    if (isMobile()) {
      closeSidebar();
    }

    t.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (s.classList.contains('open') || s.dataset.open === 'true' || s.style.transform === 'translateX(0px)' || s.style.transform === 'translateX(0)') {
        closeSidebar();
      } else {
        openSidebar();
      }
    });

    if (c && !c._vmBound) {
      c._vmBound = true;
      c.addEventListener('click', function (e) {
        e.preventDefault();
        closeSidebar();
      });
    }

    if (b && !b._vmBound) {
      b._vmBound = true;
      b.addEventListener('click', function (e) {
        e.preventDefault();
        closeSidebar();
      });
    }

    // Close sidebar when any sidebar link is clicked on mobile
    s.querySelectorAll('a').forEach(function (link) {
      if (!link._vmSidebarBound) {
        link._vmSidebarBound = true;
        link.addEventListener('click', function () {
          if (isMobile()) closeSidebar();
        });
      }
    });
  }

  // ---------------------------------------------------------------------
  // 3. MASTER INIT & RESIZE HANDLING
  // ---------------------------------------------------------------------
  function init() {
    initPublicNav();
    initAppSidebar();

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeSidebar();
        closeMobileMenu();
      }
    });

    window.addEventListener('resize', function () {
      if (!isMobile()) {
        closeMobileMenu();
        var s = getSidebar(), b = getBackdrop();
        if (s) {
          s.style.removeProperty('transform');
          s.classList.remove('open');
          s.dataset.open = 'false';
        }
        if (b) {
          b.style.display = '';
          b.classList.add('hidden');
          b.classList.remove('open');
        }
        document.body.classList.remove('mobile-sidebar-open');
        document.body.style.overflow = '';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  window.VevahaMobile = {
    openSidebar: openSidebar,
    closeSidebar: closeSidebar,
    openMobileMenu: openMobileMenu,
    closeMobileMenu: closeMobileMenu,
    toggleMobileMenu: toggleMobileMenu
  };
  window.setSidebar = function (open) { open ? openSidebar() : closeSidebar(); };
})();
