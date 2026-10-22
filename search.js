// Search functionality for VevahaMatrimony
class SearchManager {
    constructor() {
        this.recentSearches = this.loadRecentSearches();
        this.currentUser = null;
        this.isLoggedIn = false;

        // Initialize search functionality
        this.init();
    }

    init() {
        // Check user authentication
        this.checkUserAuth();

        // Initialize search input listeners
        this.initializeSearchInput();

        // Show recent searches on focus
        this.setupRecentSearches();
    }

    checkUserAuth() {
        const userData = localStorage.getItem('userData');
        const userSession = localStorage.getItem('userSession');

        this.isLoggedIn = userData && userSession === 'active';
        if (this.isLoggedIn) {
            try {
                this.currentUser = JSON.parse(userData);
            } catch (error) {
                console.error('Error parsing user data:', error);
                this.isLoggedIn = false;
            }
        }
    }

    initializeSearchInput() {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return;

        // Focus and blur events for recent searches
        searchInput.addEventListener('focus', () => {
            this.showRecentSearches();
        });

        searchInput.addEventListener('blur', (e) => {
            // Delay hiding to allow clicking on recent searches
            setTimeout(() => {
                if (!e.relatedTarget || !e.relatedTarget.closest('#recentSearches')) {
                    this.hideRecentSearches();
                }
            }, 200);
        });

        // Input event for suggestions
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            if (query.length > 0) {
                this.updateRecentSearchesDisplay(query);
            }
        });
    }

    setupRecentSearches() {
        const recentSearchesContainer = document.getElementById('recentSearches');
        if (!recentSearchesContainer) return;

        // Prevent search container from closing when clicked
        recentSearchesContainer.addEventListener('mousedown', (e) => {
            e.preventDefault();
        });
    }

    loadRecentSearches() {
        try {
            const saved = localStorage.getItem('recentSearches');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Error loading recent searches:', error);
            return [];
        }
    }

    saveRecentSearches() {
        try {
            localStorage.setItem('recentSearches', JSON.stringify(this.recentSearches));
        } catch (error) {
            console.error('Error saving recent searches:', error);
        }
    }

    addToRecentSearches(query) {
        if (!query || query.trim().length < 2) return;

        const trimmedQuery = query.trim().toLowerCase();

        // Remove if already exists
        this.recentSearches = this.recentSearches.filter(item => item.toLowerCase() !== trimmedQuery);

        // Add to beginning
        this.recentSearches.unshift(trimmedQuery);

        // Keep only last 10 searches
        this.recentSearches = this.recentSearches.slice(0, 10);

        this.saveRecentSearches();
    }

    removeFromRecentSearches(query) {
        this.recentSearches = this.recentSearches.filter(item =>
            item.toLowerCase() !== query.toLowerCase()
        );
        this.saveRecentSearches();
        this.updateRecentSearchesDisplay();
    }

    showRecentSearches() {
        const container = document.getElementById('recentSearches');
        if (!container || this.recentSearches.length === 0) return;

        this.updateRecentSearchesDisplay();
        container.classList.remove('hidden');
    }

    hideRecentSearches() {
        const container = document.getElementById('recentSearches');
        if (container) {
            container.classList.add('hidden');
        }
    }

    updateRecentSearchesDisplay(currentQuery = '') {
        const listContainer = document.getElementById('recentSearchList');
        if (!listContainer) return;

        listContainer.innerHTML = '';

        // Filter recent searches based on current input
        const filteredSearches = currentQuery.length > 0
            ? this.recentSearches.filter(search =>
                search.toLowerCase().includes(currentQuery.toLowerCase())
            )
            : this.recentSearches;

        if (filteredSearches.length === 0) {
            this.hideRecentSearches();
            return;
        }

        filteredSearches.forEach(search => {
            const item = document.createElement('div');
            item.className = 'flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded cursor-pointer group';

            item.innerHTML = `
                <div class="flex items-center flex-1" onclick="searchManager.selectRecentSearch('${search}')">
                    <i class="fas fa-history text-gray-400 mr-3"></i>
                    <span class="text-sm text-gray-700">${this.highlightMatch(search, currentQuery)}</span>
                </div>
                <button onclick="searchManager.removeFromRecentSearches('${search}')" 
                        class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 ml-2">
                    <i class="fas fa-times text-xs"></i>
                </button>
            `;

            listContainer.appendChild(item);
        });
    }

    highlightMatch(text, query) {
        if (!query) return text;

        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<span class="font-semibold text-pink-600">$1</span>');
    }

    selectRecentSearch(query) {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = query;
            this.hideRecentSearches();
            this.performSearch(query);
        }
    }

    async performSearch(query = null) {
        const searchInput = document.getElementById('searchInput');
        const searchQuery = query || (searchInput ? searchInput.value.trim() : '');

        if (!searchQuery) {
            this.showMessage('Please enter a search term', 'error');
            return;
        }

        // Add to recent searches
        this.addToRecentSearches(searchQuery);
        this.hideRecentSearches();

        // Check if searching for website features
        const redirectUrl = this.checkWebsiteRedirect(searchQuery);
        if (redirectUrl) {
            this.showMessage(`Redirecting to ${searchQuery}...`, 'info');
            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 1000);
            return;
        }

        // Redirect to search results page if not already there
        if (!window.location.pathname.includes('search-results.html')) {
            window.location.href = `search-results.html?q=${encodeURIComponent(searchQuery)}`;
            return;
        }

        // Perform the actual search
        this.searchProfiles(searchQuery);
    }

    checkWebsiteRedirect(query) {
        const lowerQuery = query.toLowerCase().trim();

        const redirectMappings = {
            'home': 'index.html',
            'homepage': 'index.html',
            'about': 'about.html',
            'about us': 'about.html',
            'contact': 'contact.html',
            'contact us': 'contact.html',
            'faq': 'faq.html',
            'help': 'faq.html',
            'register': 'register.html',
            'signup': 'register.html',
            'sign up': 'register.html',
            'login': 'login.html',
            'signin': 'login.html',
            'sign in': 'login.html',
            'membership': 'membership.html',
            'plans': 'membership.html',
            'premium': 'membership.html',
            'pricing': 'membership.html',
            'find': 'advanced-search.html',
            'search': 'advanced-search.html',
            'find match': 'advanced-search.html',
            'search match': 'advanced-search.html',
            'matches': 'matches.html',
            'profile': 'profile.html',
            'dashboard': 'home.html',
            'messages': 'messages.html',
            'chat': 'messages.html',
            'requests': 'requests.html',
            'privacy': 'privacy-policy.html',
            'privacy policy': 'privacy-policy.html',
            'terms': 'terms.html',
            'terms and conditions': 'terms.html',
            'safety': 'safety-tips.html',
            'safety tips': 'safety-tips.html',
            'active members': 'active-members.html',
            'members': 'active-members.html',
            'bride': 'advanced-search.html',
            'groom': 'advanced-search.html',
            'partner': 'advanced-search.html',
            'spouse': 'advanced-search.html',
            'life partner': 'advanced-search.html'
        };

        // Check for exact match
        if (redirectMappings[lowerQuery]) {
            return redirectMappings[lowerQuery];
        }

        // Check for partial matches
        for (const [key, value] of Object.entries(redirectMappings)) {
            if (key.includes(lowerQuery) || lowerQuery.includes(key)) {
                return value;
            }
        }

        return null;
    }

    async searchProfiles(query, isMemerId = false) {
        try {
            this.showLoadingState();

            if (!window.nhostClient) {
                this.showMessage('Search unavailable. Please try again later.', 'error');
                this.hideLoadingState();
                return;
            }

            let gqlQuery, variables;

            if (isMemerId) {
                gqlQuery = `
                    query SearchByMemberId($memberId: String!) {
                        profiles(where: { member_id: { _eq: $memberId }, profile_status: { _neq: "hidden" } }, limit: 50) {
                            id member_id full_name date_of_birth age caste education job_roles city profile_picture_url
                        }
                    }
                `;
                variables = { memberId: query };
            } else {
                gqlQuery = `
                    query SearchProfiles($query: String!) {
                        profiles(where: {
                            _or: [
                                { full_name: { _ilike: $query } },
                                { caste: { _ilike: $query } },
                                { city: { _ilike: $query } },
                                { state: { _ilike: $query } },
                                { job_roles: { _ilike: $query } },
                                { education: { _ilike: $query } },
                                { religion: { _ilike: $query } },
                                { member_id: { _ilike: $query } }
                            ],
                            profile_status: { _neq: "hidden" }
                        }, limit: 50) {
                            id member_id full_name date_of_birth age caste education job_roles city profile_picture_url
                        }
                    }
                `;
                variables = { query: `%${query}%` };
            }

            const { data, error } = await window.nhostClient.graphql.request(gqlQuery, variables);

            if (error) {
                console.error('Search GraphQL error:', error);
                this.showMessage('Unable to fetch profiles right now.', 'error');
                this.hideLoadingState();
                return;
            }

            const profiles = data?.profiles || [];

            this.hideLoadingState();

            if (profiles.length > 0) {
                this.displaySearchResults(profiles, query);
            } else {
                this.showNoResults();
            }

        } catch (error) {
            console.error('Search error:', error);
            this.hideLoadingState();
            this.showMessage('Something went wrong. Please try again.', 'error');
        }
    }

    displaySearchResults(profiles, query) {
        const resultsContainer = document.getElementById('searchResults');
        const profilesGrid = document.getElementById('profilesGrid');
        const resultsCount = document.getElementById('resultsCount');
        const noResults = document.getElementById('noResults');

        if (!resultsContainer || !profilesGrid || !resultsCount) return;

        // Hide no results and loading
        noResults.classList.add('hidden');
        this.hideLoadingState();

        // Update results count
        resultsCount.textContent = `Found ${profiles.length} ${profiles.length === 1 ? 'profile' : 'profiles'}`;

        // Clear previous results
        profilesGrid.innerHTML = '';

        // Display profiles
        profiles.forEach(profile => {
            const profileCard = this.createProfileCard(profile, query);
            profilesGrid.appendChild(profileCard);
        });

        // Show results
        resultsContainer.classList.remove('hidden');
    }

    createProfileCard(profile, query) {
        const wrapper = document.createElement('div');

        // Normalize profile data for MemberCard component
        const normalizedProfile = {
            id: profile.id,
            matrimony_id: profile.member_id || `VM${profile.id}`,
            full_name: profile.full_name,
            date_of_birth: profile.date_of_birth,
            age: profile.age || this.calculateAge(profile.date_of_birth),
            caste: profile.caste,
            subcaste: profile.subcaste,
            education: profile.education,
            profession: profile.profession,
            city: profile.city,
            profile_photo: profile.profile_picture,
            is_verified: profile.is_verified === true,
            aadhaar_verified: profile.aadhaar_verified === true,
            hide_photo: profile.hide_photo === true,
            profile_photo_locked: profile.profile_photo_locked === true,
            is_shortlisted: profile.is_shortlisted === true,
            interest_confirmed: profile.interest_confirmed === true,
            is_admin_uploaded: profile.is_admin_uploaded === true
        };

        // Use unified MemberCard component if available
        if (typeof MemberCard !== 'undefined') {
            const memberCard = new MemberCard(normalizedProfile, {
                showViewMore: true,
                showActions: true
            });
            wrapper.innerHTML = memberCard.render();
        } else {
            // Fallback to simple card
            wrapper.innerHTML = `
                <div class="bg-white rounded-2xl shadow-md p-6">
                    <h3 class="text-xl font-bold mb-2">${normalizedProfile.full_name || 'Anonymous'}</h3>
                    <p class="text-gray-600">${normalizedProfile.matrimony_id}</p>
                    <p class="text-sm text-gray-500">${normalizedProfile.age ? normalizedProfile.age + ' Yrs' : 'Age not specified'}, ${normalizedProfile.city || 'N/A'}</p>
                </div>
            `;
        }

        return wrapper.firstElementChild;
    }

    highlightSearchTerm(text, query) {
        if (!text || !query) return text;

        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<span class="search-highlight">$1</span>');
    }

    calculateAge(birthDate) {
        if (!birthDate) return 'N/A';

        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }

        return age;
    }

    showLoadingState() {
        const loading = document.getElementById('loadingState');
        const results = document.getElementById('searchResults');
        const noResults = document.getElementById('noResults');

        if (loading) loading.classList.remove('hidden');
        if (results) results.classList.add('hidden');
        if (noResults) noResults.classList.add('hidden');
    }

    hideLoadingState() {
        const loading = document.getElementById('loadingState');
        if (loading) loading.classList.add('hidden');
    }

    showNoResults() {
        const noResults = document.getElementById('noResults');
        const results = document.getElementById('searchResults');

        this.hideLoadingState();

        if (results) results.classList.add('hidden');
        if (noResults) noResults.classList.remove('hidden');
    }

    showLoginRequired() {
        const overlay = document.getElementById('loginOverlay');
        if (overlay) {
            overlay.classList.remove('hidden');
        }
    }

    showMessage(message, type = 'info') {
        // Use the existing showMessage function from script.js
        if (window.showMessage) {
            window.showMessage(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// Initialize search manager
let searchManager;

document.addEventListener('DOMContentLoaded', function () {
    searchManager = new SearchManager();
});

// Global functions for search
window.handleSearchKeyPress = function (event) {
    if (event.key === 'Enter') {
        searchManager.performSearch();
    }
};

window.performSearch = function () {
    searchManager.performSearch();
};

window.performSearchOnPage = function (query) {
    searchManager.searchProfiles(query);
};

// Profile interaction functions
window.viewProfile = function (profileId) {
    if (profileId.startsWith('fake_')) {
        searchManager.showMessage('This is a sample profile for demonstration', 'info');
        return;
    }

    window.location.href = `profile.html?id=${profileId}`;
};

window.sendInterest = function (profileId) {
    if (profileId.startsWith('fake_')) {
        searchManager.showMessage('This is a sample profile for demonstration', 'info');
        return;
    }

    // Implement interest sending logic
    searchManager.showMessage('Interest sent successfully!', 'success');
};

window.handleDecline = function (profileId) {
    if (profileId.startsWith('fake_')) {
        searchManager.showMessage('This is a sample profile for demonstration', 'info');
        return;
    }

    searchManager.showMessage('Profile declined', 'info');
};

window.handleWhatsAppClick = function (profileId) {
    if (profileId.startsWith('fake_')) {
        searchManager.showMessage('This is a sample profile for demonstration', 'info');
        return;
    }

    searchManager.showMessage('Opening WhatsApp...', 'info');
};

window.handleCallClick = function (profileId) {
    if (profileId.startsWith('fake_')) {
        searchManager.showMessage('This is a sample profile for demonstration', 'info');
        return;
    }

    searchManager.showMessage('Initiating call...', 'info');
};

// Export for use in other files
window.searchManager = searchManager;
