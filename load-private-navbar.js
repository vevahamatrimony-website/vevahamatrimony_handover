// Load private navbar component dynamically (no auth required)
(function loadPrivateNavbar() {
    async function init() {
        try {
            const response = await fetch('private-navbar.html');
            if (!response.ok) return; // partial not found — silently skip
            const html = await response.text();
            const placeholder = document.getElementById('private-navbar-placeholder');
            if (placeholder) {
                placeholder.innerHTML = html;
            }
            updateActiveNavLink();
        } catch (e) {
            // Ignore load errors silently in frontend-only mode
        }
    }

    function updateActiveNavLink() {
        const currentPage = window.location.pathname.split('/').pop() || 'home.html';
        document.querySelectorAll('nav a[href]').forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPage) {
                link.classList.add('text-pink-600', 'font-semibold', 'border-b-2', 'border-pink-600');
                link.classList.remove('text-gray-700', 'hover:text-pink-600');
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
