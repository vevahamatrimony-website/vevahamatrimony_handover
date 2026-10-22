// Load public navbar component dynamically (no auth required)
(function loadPublicNavbar() {
    async function init() {
        try {
            const response = await fetch('public-navbar.html');
            if (!response.ok) return;
            const html = await response.text();
            const placeholder = document.getElementById('public-navbar-placeholder');
            if (placeholder) {
                placeholder.innerHTML = html;
            }
        } catch (e) {
            // Ignore silently
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
