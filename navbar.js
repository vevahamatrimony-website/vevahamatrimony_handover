
// ========================================
// VEVAHA MATRIMONY - SHARED NAVBAR COMPONENT
// Dynamically renders navbar based on auth state
// ========================================

const NAVBAR_CONFIG = {
    LOGO_SRC: 'images/vevaha-logo.png',
    BRAND_NAME: 'VevahaMatrimony',
    PUBLIC_LINKS: [
        { href: 'index.html', label: 'Home', labelTa: 'முகப்பு' },
        { href: 'register.html', label: 'Register', labelTa: 'பதிவு' },
        { href: 'membership.html', label: 'Premium Plans', labelTa: 'பிரீமியம் திட்டங்கள்' },
        { href: 'login.html', label: 'Active Members', labelTa: 'செயலில் உள்ள உறுப்பினர்கள்' },
        { href: 'horoscopic-chatbot.html', label: 'Astro AI', labelTa: 'AI கேட்க' }
    ],
    PROTECTED_LINKS: [
        { href: 'home.html', label: 'Dashboard', labelTa: 'டாஷ்போர்டு' },
        { href: 'matches.html', label: 'Matches', labelTa: 'பொருத்தங்கள்' },
        { href: 'interested-profiles.html', label: 'Interested', labelTa: 'ஆர்வமுள்ள' },
        { href: 'requests.html', label: 'Requests', labelTa: 'கோரிக்கைகள்' },
        { href: 'active-members.html', label: 'Active Members', labelTa: 'செயலில் உள்ள உறுப்பினர்கள்' },
        { href: 'horoscopic-chatbot.html', label: 'Astro AI', labelTa: 'AI கேட்க' }
    ]
};

window.VevahaNavbar = {
    isInitialized: false,
    currentUser: null,

    getCurrentPage() {
        const path = window.location.pathname;
        return path.split('/').pop() || 'index.html';
    },

    isActiveLink(href) {
        return this.getCurrentPage() === href;
    },

    async init() {
        if (this.isInitialized) return;
        
        console.log('🧭 Initializing VevahaNavbar...');
        
        const navContainer = document.getElementById('navbar-container');
        if (!navContainer) {
            console.warn('⚠️ No navbar-container element found');
            return;
        }

        await this.waitForAuth();
        
        const isAuth = await this.checkAuth();
        this.render(navContainer, isAuth);
        this.setupEventListeners();
        this.isInitialized = true;
        
        console.log('✅ VevahaNavbar initialized');
    },

    async waitForAuth(maxWait = 3000) {
        // Optimized to prevent thread starvation
        const checkAuth = async (attempts = 0) => {
            if (window.VevahaAuth) {
                await window.VevahaAuth.waitForSupabase();
                return;
            }
            if (attempts > 30) return; // 3 secs
            await new Promise(r => setTimeout(r, 100));
            await checkAuth(attempts + 1);
        };
        await checkAuth();
    },

    async checkAuth() {
        try {
            const authToken = localStorage.getItem('authToken');
            const userData = localStorage.getItem('userData');
            const userSession = localStorage.getItem('userSession');
            
            if (authToken && userData && userSession === 'active') {
                this.currentUser = JSON.parse(userData);
                return true;
            }
            
            if (window.VevahaAuth) {
                const session = await window.VevahaAuth.getSession();
                if (session) {
                    this.currentUser = window.VevahaAuth.getStoredUser() || {
                        email: session.user?.email,
                        fullName: session.user?.user_metadata?.fullName || session.user?.user_metadata?.full_name || ''
                    };
                    return true;
                }
            }
            
            return false;
        } catch (error) {
            console.error('❌ Navbar auth check error:', error);
            return false;
        }
    },

    getUserDisplayName() {
        if (!this.currentUser) return 'User';
        return this.currentUser.fullName || 
               this.currentUser.full_name || 
               this.currentUser.email?.split('@')[0] || 
               'User';
    },

    render(container, isAuthenticated) {
        const links = isAuthenticated ? NAVBAR_CONFIG.PROTECTED_LINKS : NAVBAR_CONFIG.PUBLIC_LINKS;
        const currentPage = this.getCurrentPage();
        
        container.innerHTML = `
            <nav class="bg-white shadow-lg sticky top-0 z-50">
                <div class="w-full">
                    <div class="flex justify-between items-center h-16">
                        <!-- Logo -->
                        <div class="flex items-center flex-shrink-0">
                            <a href="index.html" class="navbar-brand flex items-center text-xl sm:text-2xl font-bold text-pink-600">
                                <img src="${NAVBAR_CONFIG.LOGO_SRC}" alt="Vevaha Logo" class="w-10 h-10 mr-2">
                                ${NAVBAR_CONFIG.BRAND_NAME}
                            </a>
                        </div>
                        
                        <!-- Desktop Navigation -->
                        <div class="hidden lg:flex items-center space-x-4">
                            ${links.map(link => `
                                <a href="${link.href}" class="${this.isActiveLink(link.href) ? 'text-pink-600 border-b-2 border-pink-600' : 'text-gray-700 hover:text-pink-600'} px-3 py-2 rounded-md font-medium">
                                    <span class="lang-en">${link.label}</span>
                                    <span class="lang-ta hidden">${link.labelTa}</span>
                                </a>
                            `).join('')}
                            
                            <!-- Search Bar -->
                            <div class="relative">
                                <input type="text" id="navSearchInput" placeholder="Search..." 
                                       class="bg-gray-100 text-gray-700 rounded-full px-4 py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white w-40 transition-all duration-300">
                                <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                            </div>
                            
                            ${isAuthenticated ? this.renderAuthenticatedButtons() : this.renderGuestButtons()}
                        </div>
                        
                        <!-- Mobile Navigation Button -->
                        <div class="lg:hidden flex items-center space-x-2">
                            ${isAuthenticated ? `<span class="text-pink-600 text-sm font-medium">${this.getUserDisplayName().substring(0, 10)}</span>` : ''}
                            <button id="mobile-menu-btn" class="text-gray-700 hover:text-pink-600 focus:outline-none">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>
            
            <!-- Mobile Navigation Menu -->
            <div id="mobile-nav-menu" class="hidden lg:hidden bg-white shadow-lg border-t">
                <div class="px-4 py-2 space-y-2">
                    ${links.map(link => `
                        <a href="${link.href}" class="block ${this.isActiveLink(link.href) ? 'text-pink-600 font-medium' : 'text-gray-700 hover:text-pink-600'} px-3 py-2 rounded-md">
                            <span class="lang-en">${link.label}</span>
                            <span class="lang-ta hidden">${link.labelTa}</span>
                        </a>
                    `).join('')}
                    
                    ${isAuthenticated ? `
                        <div class="border-t pt-2 mt-2">
                            <a href="profile.html" class="block text-gray-700 hover:text-pink-600 px-3 py-2 rounded-md">
                                <i class="fas fa-user mr-2"></i>My Profile
                            </a>
                            <a href="account-settings.html" class="block text-gray-700 hover:text-pink-600 px-3 py-2 rounded-md">
                                <i class="fas fa-edit mr-2"></i>Edit Profile
                            </a>
                            <a href="settings.html" class="block text-gray-700 hover:text-pink-600 px-3 py-2 rounded-md">
                                <i class="fas fa-cog mr-2"></i>Settings
                            </a>
                            <button id="mobile-logout-btn" class="block w-full text-left bg-red-500 text-white px-3 py-2 rounded-md hover:bg-red-600 mt-2">
                                <i class="fas fa-sign-out-alt mr-2"></i>Logout
                            </button>
                        </div>
                    ` : `
                        <div class="border-t pt-2 mt-2 flex space-x-2">
                            <a href="login.html" class="flex-1 text-center bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700">Login</a>
                            <a href="register.html" class="flex-1 text-center border border-pink-600 text-pink-600 px-4 py-2 rounded-md hover:bg-pink-50">Register</a>
                        </div>
                    `}
                </div>
            </div>
        `;
    },

    renderAuthenticatedButtons() {
        return `
            <!-- User Dropdown -->
            <div class="relative" id="user-dropdown-container">
                <button id="user-dropdown-btn" class="flex items-center space-x-2 text-pink-600 hover:text-pink-700 focus:outline-none">
                    <i class="fas fa-user-circle text-2xl"></i>
                    <span class="font-medium">${this.getUserDisplayName()}</span>
                    <i class="fas fa-chevron-down text-sm"></i>
                </button>
                
                <div id="user-dropdown-menu" class="hidden absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-2 z-50">
                    <a href="profile.html" class="block px-4 py-2 text-gray-700 hover:bg-pink-50 hover:text-pink-600">
                        <i class="fas fa-user mr-2"></i>My Profile
                    </a>
                    <a href="account-settings.html" class="block px-4 py-2 text-gray-700 hover:bg-pink-50 hover:text-pink-600">
                        <i class="fas fa-edit mr-2"></i>Edit Profile
                    </a>
                    <a href="settings.html" class="block px-4 py-2 text-gray-700 hover:bg-pink-50 hover:text-pink-600">
                        <i class="fas fa-cog mr-2"></i>Settings
                    </a>
                    <div class="border-t my-2"></div>
                    <button id="dropdown-logout-btn" class="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-50">
                        <i class="fas fa-sign-out-alt mr-2"></i>Logout
                    </button>
                </div>
            </div>
        `;
    },

    renderGuestButtons() {
        return `
            <a href="login.html" class="bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700 font-medium">
                <span class="lang-en">Login</span>
                <span class="lang-ta hidden">உள்நுழை</span>
            </a>
            <a href="register.html" class="border border-pink-600 text-pink-600 px-4 py-2 rounded-md hover:bg-pink-50 font-medium">
                <span class="lang-en">Register</span>
                <span class="lang-ta hidden">பதிவு</span>
            </a>
        `;
    },

    setupEventListeners() {
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const mobileNavMenu = document.getElementById('mobile-nav-menu');
        
        if (mobileMenuBtn && mobileNavMenu) {
            mobileMenuBtn.addEventListener('click', () => {
                mobileNavMenu.classList.toggle('hidden');
            });
        }

        const userDropdownBtn = document.getElementById('user-dropdown-btn');
        const userDropdownMenu = document.getElementById('user-dropdown-menu');
        
        if (userDropdownBtn && userDropdownMenu) {
            userDropdownBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                userDropdownMenu.classList.toggle('hidden');
            });
            
            document.addEventListener('click', (e) => {
                if (!userDropdownBtn.contains(e.target) && !userDropdownMenu.contains(e.target)) {
                    userDropdownMenu.classList.add('hidden');
                }
            });
        }

        const logoutBtns = document.querySelectorAll('#dropdown-logout-btn, #mobile-logout-btn');
        logoutBtns.forEach(btn => {
            btn.addEventListener('click', async () => {
                await this.handleLogout();
            });
        });

        const searchInput = document.getElementById('navSearchInput');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const query = searchInput.value.trim();
                    if (query) {
                        window.location.href = `advanced-search.html?q=${encodeURIComponent(query)}`;
                    }
                }
            });
        }
    },

    async handleLogout() {
        try {
            if (window.VevahaAuth) {
                await window.VevahaAuth.logout();
            } else {
                localStorage.removeItem('authToken');
                localStorage.removeItem('userData');
                localStorage.removeItem('userSession');
                sessionStorage.clear();
            }
            
            window.location.href = 'login.html';
        } catch (error) {
            console.error('❌ Logout error:', error);
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = 'login.html';
        }
    },

    async refresh() {
        this.isInitialized = false;
        await this.init();
    }
};

document.addEventListener('DOMContentLoaded', async function() {
    setTimeout(async () => {
        await window.VevahaNavbar.init();
    }, 200);
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.VevahaNavbar;
}

