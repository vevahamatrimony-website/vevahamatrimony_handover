// Load sidebar component dynamically (no auth required)
(function loadSidebar() {
    async function init() {
        try {
            const response = await fetch('sidebar.html');
            if (!response.ok) return; // partial not found — silently skip
            const html = await response.text();
            const placeholder = document.getElementById('sidebar-placeholder');
            if (placeholder) {
                placeholder.innerHTML = html;
            }
        } catch (e) {
            // Ignore load errors silently in frontend-only mode
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
