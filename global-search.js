/**
 * Global Search Module - Works across ALL pages
 * Provides fuzzy matching for page navigation with dropdown suggestions
 */

const GlobalSearch = (() => {
    // Page mapping with aliases
    const routes = {
        "home": "index.html",
        "index": "index.html",
        "main": "index.html",
        "membership": "membership.html",
        "plans": "membership.html",
        "upgrade": "membership.html",
        "premium": "membership.html",
        "active": "active-members.html",
        "members": "active-members.html",
        "matches": "active-members.html",
        "dashboard": "home.html",
        "shortlist": "shortlist.html",
        "saved": "shortlist.html",
        "interested": "interested-profiles.html",
        "interest": "interested-profiles.html",
        "contacted": "contacted.html",
        "messages": "messages.html",
        "chat": "messages.html",
        "profile": "profile.html",
        "account": "profile.html",
        "edit": "account-settings.html",
        "register": "register.html",
        "signup": "register.html",
        "login": "login.html",
        "signin": "login.html",
        "contact": "contact.html",
        "help": "help-center.html",
        "faq": "faq.html",
        "ai": "horoscope-ai.html",
        "astro": "horoscope-ai.html",
        "horoscope": "horoscope-ai.html",
        "vevaha": "vevaha-ai.html",
        "find": "find.html",
        "search": "find.html",
        "advanced": "advanced-search.html",
        "about": "about.html",
        "verify": "verify-documents.html",
        "verification": "verification.html",
        "video": "video-call.html",
        "call": "video-call.html",
        "privacy": "privacy.html"
    };

    // Suggestion pages
    const suggestionPages = [
        { page: "advanced-search.html", icon: "fas fa-heart", title: "Search your match", subtitle: "Find your perfect life partner", color: "text-pink-500" },
        { page: "active-members.html", icon: "fas fa-users", title: "Browse profiles", subtitle: "View active members", color: "text-blue-500" },
        { page: "membership.html", icon: "fas fa-crown", title: "Premium members", subtitle: "View premium profiles", color: "text-purple-500" },
        { page: "settings.html", icon: "fas fa-cog", title: "⚙️ Settings", subtitle: "Customize your experience", color: "text-gray-500" },
        { page: "about.html", icon: "fas fa-info-circle", title: "About us", subtitle: "Learn more about vevahamatrimony", color: "text-orange-500" },
        { page: "contact.html", icon: "fas fa-envelope", title: "Contact us", subtitle: "Get in touch with vevahamatrimony", color: "text-green-500" }
    ];

    let suggestionsVisible = false;

    /**
     * Calculate string similarity for fuzzy matching
     */
    function calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1;
        
        const editDistance = getEditDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    /**
     * Levenshtein distance for fuzzy matching
     */
    function getEditDistance(str1, str2) {
        const costs = [];
        for (let i = 0; i <= str1.length; i++) {
            let lastValue = i;
            for (let j = 0; j <= str2.length; j++) {
                if (i === 0) costs[j] = j;
                else if (j > 0) {
                    let newValue = costs[j - 1];
                    if (str1.charAt(i - 1) !== str2.charAt(j - 1)) {
                        newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                    }
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
            if (i > 0) costs[str2.length] = lastValue;
        }
        return costs[str2.length];
    }

    /**
     * Find best matching route using fuzzy matching
     */
    function findBestRoute(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        
        if (!term) return null;

        // First check for exact match
        if (routes[term]) {
            return routes[term];
        }

        // Check for direct substring match
        for (const [key, value] of Object.entries(routes)) {
            if (key.includes(term) || term.includes(key)) {
                return value;
            }
        }

        // Fuzzy matching with similarity scoring
        let bestMatch = null;
        let bestScore = 0.6;
        
        for (const [key, value] of Object.entries(routes)) {
            const score = calculateSimilarity(term, key);
            if (score > bestScore) {
                bestScore = score;
                bestMatch = value;
            }
        }

        return bestMatch;
    }

    /**
     * Show search suggestions dropdown
     */
    function showSearchSuggestions() {
        const suggestions = document.getElementById('searchSuggestions');
        if (suggestions) {
            suggestions.classList.remove('hidden');
            suggestions.style.display = 'block';
            suggestionsVisible = true;
        }
    }

    /**
     * Hide search suggestions dropdown
     */
    function hideSearchSuggestions() {
        const suggestions = document.getElementById('searchSuggestions');
        if (suggestions) {
            suggestions.classList.add('hidden');
            suggestions.style.display = 'none';
            suggestionsVisible = false;
        }
    }

    /**
     * Navigate to a page
     */
    function navigateToPage(page) {
        window.location.href = page;
    }

    /**
     * Handle search key press (Enter key)
     */
    function handleSearchKeyPress(event) {
        if (event.key === 'Enter') {
            performSearch();
        }
    }

    /**
     * Handle mobile search key press
     */
    function handleMobileSearchKeyPress(event) {
        if (event.key === 'Enter') {
            performMobileSearch();
        }
    }

    /**
     * Perform search and navigate
     */
    function performSearch() {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return;
        
        const searchTerm = searchInput.value.trim().toLowerCase();
        
        if (!searchTerm) {
            showSearchNotification('Please enter a search term', 'error');
            return;
        }

        const targetPage = findBestRoute(searchTerm);
        
        if (targetPage) {
            showSearchNotification(`Navigating to ${targetPage}...`, 'success');
            setTimeout(() => {
                window.location.href = targetPage;
            }, 300);
        } else {
            showSearchNotification('Searching for: ' + searchTerm, 'info');
            setTimeout(() => {
                window.location.href = `search-results.html?q=${encodeURIComponent(searchTerm)}`;
            }, 300);
        }
    }

    /**
     * Perform mobile search
     */
    function performMobileSearch() {
        const mobileSearchInput = document.getElementById('mobileSearchInput');
        if (!mobileSearchInput) return;
        
        const searchTerm = mobileSearchInput.value.trim().toLowerCase();
        
        if (!searchTerm) {
            showSearchNotification('Please enter a search term', 'error');
            return;
        }

        const targetPage = findBestRoute(searchTerm);
        
        if (targetPage) {
            showSearchNotification(`Navigating...`, 'success');
            setTimeout(() => {
                window.location.href = targetPage;
            }, 300);
        } else {
            setTimeout(() => {
                window.location.href = `search-results.html?q=${encodeURIComponent(searchTerm)}`;
            }, 300);
        }
    }

    /**
     * Show temporary notification
     */
    function showSearchNotification(message, type = 'info') {
        const existing = document.getElementById('globalSearchNotification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.id = 'globalSearchNotification';
        notification.style.cssText = `
            position: fixed;
            top: 60px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
            color: white;
            border-radius: 6px;
            z-index: 10000;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            animation: slideIn 0.3s ease-out;
        `;
        document.body.appendChild(notification);
        notification.textContent = message;

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

    /**
     * Initialize search on DOM ready
     */
    function init() {
        // Add animation styles
        if (!document.getElementById('globalSearchStyles')) {
            const style = document.createElement('style');
            style.id = 'globalSearchStyles';
            style.textContent = `
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateX(100%);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                @keyframes slideOut {
                    from {
                        opacity: 1;
                        transform: translateX(0);
                    }
                    to {
                        opacity: 0;
                        transform: translateX(100%);
                    }
                }
                .search-suggestions.hidden {
                    display: none !important;
                }
                .search-suggestions:not(.hidden) {
                    display: block !important;
                }
            `;
            document.head.appendChild(style);
        }

        // Programmatic search dropdown injection and event binding
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            // Remove inline event attributes to avoid duplicate calls, then bind programmatically
            searchInput.removeAttribute('onfocus');
            searchInput.removeAttribute('onblur');
            searchInput.removeAttribute('onkeypress');
            
            searchInput.addEventListener('focus', showSearchSuggestions);
            searchInput.addEventListener('blur', () => {
                setTimeout(hideSearchSuggestions, 180); // 180ms delay to allow click handlers on links to trigger first
            });
            searchInput.addEventListener('keypress', handleSearchKeyPress);

            if (!document.getElementById('searchSuggestions')) {
                const parent = searchInput.parentElement;
                if (parent) {
                    // Ensure the parent wrapper has relative positioning so the dropdown positions correctly
                    if (window.getComputedStyle(parent).position === 'static') {
                        parent.style.position = 'relative';
                    }
                    
                    const suggestions = document.createElement('div');
                    suggestions.id = 'searchSuggestions';
                    suggestions.className = 'absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 search-suggestions hidden';
                    suggestions.style.minWidth = '300px';
                    suggestions.innerHTML = `
                        <div class="p-2">
                            <div onmousedown="window.location.href='advanced-search.html'; return false;" class="flex items-center p-3 hover:bg-pink-50 rounded-lg cursor-pointer">
                                <i class="fas fa-heart text-pink-500 mr-3"></i>
                                <div>
                                    <div class="font-medium text-gray-800"><span>Search your match</span></div>
                                    <div class="text-xs text-gray-500"><span>Find your perfect life partner</span></div>
                                </div>
                            </div>
                            <div onmousedown="window.location.href='active-members-dash.html'; return false;" class="flex items-center p-3 hover:bg-pink-50 rounded-lg cursor-pointer">
                                <i class="fas fa-users text-blue-500 mr-3"></i>
                                <div>
                                    <div class="font-medium text-gray-800"><span>Browse profiles</span></div>
                                    <div class="text-xs text-gray-500"><span>View active members</span></div>
                                </div>
                            </div>
                            <div onmousedown="window.location.href='membership.html'; return false;" class="flex items-center p-3 hover:bg-pink-50 rounded-lg cursor-pointer">
                                <i class="fas fa-crown text-purple-500 mr-3"></i>
                                <div>
                                    <div class="font-medium text-gray-800"><span>Premium members</span></div>
                                    <div class="text-xs text-gray-500"><span>View premium profiles</span></div>
                                </div>
                            </div>
                            <div onmousedown="window.location.href='settings.html'; return false;" class="flex items-center p-3 hover:bg-pink-50 rounded-lg cursor-pointer">
                                <i class="fas fa-cog text-gray-500 mr-3"></i>
                                <div>
                                    <div class="font-medium text-gray-800"><span>Settings</span></div>
                                    <div class="text-xs text-gray-500"><span>Customize your experience</span></div>
                                </div>
                            </div>
                        </div>
                    `;
                    parent.appendChild(suggestions);
                }
            }
        }

        console.log('✅ Global Search Module initialized');
    }

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Public API
    return {
        performSearch,
        performMobileSearch,
        findBestRoute,
        showNotification: showSearchNotification,
        showSearchSuggestions,
        hideSearchSuggestions,
        navigateToPage,
        handleSearchKeyPress,
        handleMobileSearchKeyPress
    };
})();

// Global functions for inline handlers
function showSearchSuggestions() {
    GlobalSearch.showSearchSuggestions();
}

function hideSearchSuggestions() {
    GlobalSearch.hideSearchSuggestions();
}

function handleSearchKeyPress(event) {
    GlobalSearch.handleSearchKeyPress(event);
}

function handleMobileSearchKeyPress(event) {
    GlobalSearch.handleMobileSearchKeyPress(event);
}

function performSearch() {
    GlobalSearch.performSearch();
}

function performMobileSearch() {
    GlobalSearch.performMobileSearch();
}

function navigateToPage(page) {
    GlobalSearch.navigateToPage(page);
}

