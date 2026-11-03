/* VevahaMatrimony – robust mobile sidebar & UX
   Replaces old mobile-ux.js. Works on all after-login pages. */
(function () {
  'use strict';

  function isMobile() { return window.innerWidth < 768; }

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

  function init() {
    var s = getSidebar(), t = getToggle(), c = getClose(), b = getBackdrop();
    if (!s || !t) return;
    if (t._vmBound) return; // idempotent
    t._vmBound = true;

    // Ensure sidebar starts closed on mobile
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

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeSidebar();
    });

    // Close sidebar when any sidebar link is clicked on mobile
    s.querySelectorAll('a').forEach(function (link) {
      if (!link._vmSidebarBound) {
        link._vmSidebarBound = true;
        link.addEventListener('click', function () {
          if (isMobile()) closeSidebar();
        });
      }
    });

    window.addEventListener('resize', function () {
      if (!isMobile()) {
        s.style.removeProperty('transform');
        s.classList.remove('open');
        s.dataset.open = 'false';
        if (b) {
          b.style.display = '';
          b.classList.add('hidden');
          b.classList.remove('open');
        }
        document.body.classList.remove('mobile-sidebar-open');
        document.body.style.overflow = '';
      } else {
        if (!s.classList.contains('open')) {
          closeSidebar();
        }
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
    closeSidebar: closeSidebar
  };
  window.setSidebar = function(open) { open ? openSidebar() : closeSidebar(); };
})();
