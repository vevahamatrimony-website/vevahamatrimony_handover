class VevahaHoroscopicAI {
    constructor() {
        this.isOpen = false;
        this.currentPage = this.getCurrentPage();
        this.userEmail = this.getUserEmail();
        this.chatHistory = [];
        this.isTyping = false;
        this.isMinimized = false;
        this.currentLanguage = 'en';

        // Membership control
        this.isPaidMember = true; // Set to false to test membership restriction

        this.initializeWidget();
        this.loadConversationStarters();
    }

    getCurrentPage() {
        const path = window.location.pathname;
        const page = path.split('/').pop() || 'index.html';
        return page.replace('.html', '');
    }

    getUserEmail() {
        try {
            const userData = localStorage.getItem('userData');
            if (userData) {
                const user = JSON.parse(userData);
                return user.email || null;
            }
        } catch (error) {
            console.error('Error getting user email:', error);
        }
        return null;
    }

    initializeWidget() {
        // Don't show horoscopic AI widget on the main chatbot page to avoid conflicts
        if (window.location.pathname.includes('chatbot.html') || 
            window.location.pathname.endsWith('chatbot.html')) {
            console.log('Horoscopic AI widget disabled on main chatbot page');
            return;
        }

        // Create enhanced widget HTML with horoscopic theme
        const widgetHTML = `
            <div id="vevaha-horoscopic-chat-widget" class="fixed bottom-6 left-6 z-50 font-poppins" role="complementary" aria-label="VevahaHoroscopic AI Chat Assistant">
                <!-- Enhanced Floating Horoscopic Button -->
                <button id="horoscopic-chat-toggle-btn" class="horoscopic-chat-toggle-button bg-gradient-to-r from-purple-600 to-indigo-700 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-110 hover:from-purple-700 hover:to-indigo-800 group relative animate-bounce-slow" 
                        aria-label="Open VevahaHoroscopic AI Chat Assistant" 
                        aria-expanded="false"
                        tabindex="0">

                    <!-- Floating glow effect -->
                    <div class="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600 to-indigo-700 opacity-40 animate-ping"></div>
                    <div class="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600 to-indigo-700 opacity-30 animate-pulse"></div>

                    <!-- Horoscopic AI Icon with Stars -->
                    <div id="horoscopic-ai-icon" class="relative z-10 transition-all duration-300 transform group-hover:scale-110">
                        <svg class="w-9 h-9" fill="currentColor" viewBox="0 0 24 24">
                            <!-- Zodiac wheel -->
                            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.7"/>
                            <!-- Inner star -->
                            <path d="M12 2l1.09 3.26L16 4l-1.91 2.74L16 10l-3.91-1.26L12 12l-1.09-3.26L8 10l1.91-2.26L8 4l3.91 1.26L12 2z" opacity="0.9"/>
                            <!-- Constellation dots -->
                            <circle cx="7" cy="7" r="0.8"/>
                            <circle cx="17" cy="7" r="0.8"/>
                            <circle cx="7" cy="17" r="0.8"/>
                            <circle cx="17" cy="17" r="0.8"/>
                        </svg>
                        <!-- Status indicator dot -->
                        <div class="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-white animate-pulse shadow-lg">
                            <div class="absolute inset-1 bg-yellow-300 rounded-full animate-ping"></div>
                        </div>
                    </div>

                    <!-- Enhanced Tooltip -->
                    <div class="absolute bottom-full left-0 mb-3 px-4 py-2 bg-gray-800 text-white text-sm rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap shadow-xl backdrop-blur-sm">
                        VEVAHA HOROSCOPIC AI
                        <div class="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                    </div>
                </button>

                <!-- Chat redirect notice (hidden by default) -->
                <div id="horoscopic-chat-notice" class="hidden absolute bottom-20 left-0 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-xs">
                    <div class="text-sm text-gray-700">
                        <div>
                            <span class="lang-en">VEVAHA HOROSCOPIC AI</span>
                            <span class="lang-ta">வேவாகா ஜோதிடம் AI</span>
                        </div>
                        <div>
                            <span class="lang-en">Click for Vedic horoscope matchmaking</span>
                            <span class="lang-ta">வேத ஜாதக பொருத்தத்திற்கு கிளிக் செய்யவும்</span>
                        </div>
                    </div>
                </div>

                <!-- Membership Restriction Modal -->
                <div id="horoscopic-membership-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                    <div class="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
                        <div class="text-center">
                            <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg class="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                </svg>
                            </div>
                            <h3 class="text-xl font-bold text-gray-800 mb-2">Premium Feature</h3>
                            <p class="text-gray-600 mb-4">❌ This service is available only for paid members. Upgrade to Gold, Diamond, or VIP.</p>
                            <div class="space-y-2">
                                <button onclick="window.location.href='membership.html'" 
                                        class="w-full bg-purple-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-purple-700 transition">
                                    Upgrade Now
                                </button>
                                <button onclick="document.getElementById('horoscopic-membership-modal').classList.add('hidden')" 
                                        class="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg font-semibold hover:bg-gray-50 transition">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>
                .font-poppins {
                    font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }

                .horoscopic-chat-window {
                    transform: translateY(20px) scale(0.95);
                    opacity: 0;
                    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .horoscopic-chat-window.show {
                    transform: translateY(0) scale(1);
                    opacity: 1;
                }

                .horoscopic-chat-toggle-button {
                    transform: translateY(0);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 8px 25px rgba(124, 58, 237, 0.3);
                }

                .horoscopic-chat-toggle-button:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 12px 35px rgba(124, 58, 237, 0.4);
                }

                @keyframes bounce-slow {
                    0%, 100% { 
                        transform: translateY(0px) scale(1);
                        animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
                    }
                    50% { 
                        transform: translateY(-4px) scale(1.02);
                        animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
                    }
                }

                .animate-bounce-slow {
                    animation: bounce-slow 3s infinite;
                }

                /* Language specific styles */
                .lang-ta { 
                    display: none; 
                    font-family: 'Noto Sans Tamil', sans-serif;
                }

                .lang-en { 
                    display: block; 
                    font-family: 'Poppins', sans-serif;
                }

                [data-lang="ta"] .lang-ta { 
                    display: block !important; 
                }

                [data-lang="ta"] .lang-en { 
                    display: none !important; 
                }

                /* Mobile responsiveness */
                @media (max-width: 480px) {
                    .horoscopic-chat-window {
                        width: calc(100vw - 1.5rem) !important;
                        height: calc(100vh - 4rem) !important;
                        bottom: 0.75rem !important;
                        left: 0.75rem !important;
                    }

                    .horoscopic-chat-toggle-button {
                        width: 56px;
                        height: 56px;
                    }

                    #vevaha-horoscopic-chat-widget {
                        bottom: 1rem;
                        left: 1rem;
                    }
                }
            </style>
        `;

        // Insert widget into page
        document.body.insertAdjacentHTML('beforeend', widgetHTML);

        // Bind events
        this.bindEvents();
    }

    bindEvents() {
        const toggleBtn = document.getElementById('horoscopic-chat-toggle-btn');

        // Toggle chat - redirect to horoscopic chatbot page
        if (toggleBtn) {
            toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleChat();
            });

            // Also bind keyboard accessibility
            toggleBtn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    this.toggleChat();
                }
            });
        }

        // Keyboard accessibility for global shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Shift + H for horoscopic AI
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'H') {
                e.preventDefault();
                this.toggleChat();
            }
        });
    }

    toggleChat() {
        // Redirect to dedicated horoscopic chatbot page instead of opening inline chat
        console.log('Redirecting to horoscopic-chatbot.html...');
        try {
            // Store current page as referrer for return navigation
            const currentPage = window.location.pathname.split('/').pop() || 'index.html';
            localStorage.setItem('horoscopicChatbotReferrer', currentPage);

            // Navigate to horoscopic chatbot
            window.location.href = 'horoscopic-chatbot.html';
        } catch (error) {
            console.error('Error redirecting to horoscopic chatbot:', error);
            // Fallback navigation method
            window.location.assign('horoscopic-chatbot.html');
        }
    }

    openChat() {
        // Redirect to dedicated horoscopic chatbot page
        window.location.href = 'horoscopic-chatbot.html';
    }

    closeChat() {
        // No longer needed since we redirect to separate page
        console.log('Redirecting to horoscopic chatbot...');
        window.location.href = 'horoscopic-chatbot.html';
    }

    minimizeChat() {
        // No longer needed since we redirect to separate page
        this.closeChat();
    }

    // Simplified method that just redirects
    async sendMessage() {
        window.location.href = 'horoscopic-chatbot.html';
    }

    async loadConversationStarters() {
        // No longer needed since we use separate page
        console.log('Horoscopic AI uses separate page - no inline starters needed');
    }

    async processMatchmakingRequest(matrimonyId) {
        try {
            console.log('🔮 Processing matchmaking request for:', matrimonyId);

            // Validate matrimony ID format
            const matrimonyIdPattern = /^VM\d{8,12}$/i;
            if (!matrimonyIdPattern.test(matrimonyId)) {
                return "🔮 Vanakkam! Please provide a valid Matrimony ID format (e.g., VM1234567890).";
            }

            // Make API call to backend horoscopic AI
            const response = await fetch('/horoscopic-ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    message: `Find matches for ${matrimonyId}`,
                    language: 'en',
                    source: 'widget_matchmaking'
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            if (data.success && data.reply) {
                return data.reply;
            } else {
                return "🔮 Vanakkam! Sorry, I couldn't find matching profiles at this time. Please contact our astrology team for personalized assistance.";
            }

        } catch (error) {
            console.error('Error processing matchmaking request:', error);

            if (error.message.includes('not found')) {
                return `🔮 Vanakkam! Profile ${matrimonyId} not found in our database. Please verify the Matrimony ID and ensure the profile is verified and visible.`;
            }

            return "🔮 Vanakkam! Sorry, I'm experiencing technical difficulties accessing the horoscopic database. Please try again or contact our astrology support team.";
        }
    }
}

// Initialize the horoscopic widget when the script loads
document.addEventListener('DOMContentLoaded', function() {
    if (!window.vevahaHoroscopicAI) {
        window.vevahaHoroscopicAI = new VevahaHoroscopicAI();
    }
});

// Also initialize immediately if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVevahaHoroscopicAI);
} else {
    initVevahaHoroscopicAI();
}

function initVevahaHoroscopicAI() {
    if (!window.vevahaHoroscopicAI) {
        window.vevahaHoroscopicAI = new VevahaHoroscopicAI();
    }
}

// Make VevahaHoroscopicAI globally available
window.VevahaHoroscopicAI = VevahaHoroscopicAI;