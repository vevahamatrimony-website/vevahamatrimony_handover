class VevahaAI {
    constructor() {
        this.isOpen = false;
        this.currentPage = this.getCurrentPage();
        this.userEmail = this.getUserEmail();
        this.chatHistory = [];
        this.isTyping = false;
        this.isMinimized = false;

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
        // Don't show AI widget on chatbot/AI pages to avoid conflicts
        if (window.location.pathname.includes('horoscopic-chatbot.html') || 
            window.location.pathname.endsWith('horoscopic-chatbot.html') ||
            window.location.pathname.includes('chatbot.html') || 
            window.location.pathname.endsWith('chatbot.html') ||
            window.location.pathname.includes('vevaha-ai.html') || 
            window.location.pathname.endsWith('vevaha-ai.html')) {
            console.log('VevahaAI widget disabled on chatbot/AI pages');
            return;
        }

        // Create enhanced widget HTML - floating button only
        const widgetHTML = `
            <div id="vevaha-chat-widget" class="fixed bottom-6 right-6 z-50 font-poppins" role="complementary" aria-label="VevahaAI Chat Assistant">
                <!-- Enhanced Floating Button -->
                <button id="chat-toggle-btn" class="chat-toggle-button bg-gradient-to-r from-pink-600 to-pink-700 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-110 hover:from-pink-700 hover:to-pink-800 group relative animate-bounce-slow" 
                        aria-label="Open VevahaAI Chat Assistant" 
                        aria-expanded="false"
                        tabindex="0">

                    <!-- Floating glow effect -->
                    <div class="absolute inset-0 rounded-full bg-gradient-to-r from-pink-600 to-pink-700 opacity-40 animate-ping"></div>
                    <div class="absolute inset-0 rounded-full bg-gradient-to-r from-pink-600 to-pink-700 opacity-30 animate-pulse"></div>

                    <!-- AI Assistant with Headphones Icon -->
                    <div id="ai-assistant-icon" class="relative z-10 transition-all duration-300 transform group-hover:scale-110">
                        <svg class="w-9 h-9" fill="currentColor" viewBox="0 0 24 24">
                            <!-- Head -->
                            <circle cx="12" cy="8" r="4" opacity="0.9"/>
                            <!-- Body -->
                            <path d="M12 14c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" opacity="0.8"/>
                            <!-- Headphones -->
                            <path d="M12 1C8.96 1 6.5 3.46 6.5 6.5v3c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-3c0-1.66 1.34-3 3-3s3 1.34 3 3v3c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-3C17.5 3.46 15.04 1 12 1z" opacity="0.9"/>
                            <!-- Left earpiece -->
                            <circle cx="7" cy="9" r="1.5"/>
                            <!-- Right earpiece -->
                            <circle cx="17" cy="9" r="1.5"/>
                            <!-- Microphone -->
                            <path d="M16 11.5c0 .28-.22.5-.5.5s-.5-.22-.5-.5.22-.5.5-.5.5.22.5.5z"/>
                            <path d="M15.5 12h-1v2h1v-2z"/>
                        </svg>
                        <!-- Status indicator dot -->
                        <div class="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse shadow-lg">
                            <div class="absolute inset-1 bg-green-300 rounded-full animate-ping"></div>
                        </div>
                    </div>

                    <!-- Enhanced Tooltip -->
                    <div class="absolute bottom-full left-0 mb-3 px-4 py-2 bg-gray-800 text-white text-sm rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap shadow-xl backdrop-blur-sm">
                        VEVAHA AI
                        <div class="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                    </div>
                </button>
            </div>

            <style>
                .font-poppins {
                    font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }

                .chat-window {
                    transform: translateY(20px) scale(0.95);
                    opacity: 0;
                    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .chat-window.show {
                    transform: translateY(0) scale(1);
                    opacity: 1;
                }

                .chat-toggle-button {
                    transform: translateY(0);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 8px 25px rgba(255, 38, 126, 0.3);
                }

                .chat-toggle-button:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 12px 35px rgba(255, 38, 126, 0.4);
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

                @keyframes fade-in-up {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .animate-fade-in-up {
                    animation: fade-in-up 0.6s ease-out;
                }

                .scrollbar-thin {
                    scrollbar-width: thin;
                }

                .scrollbar-thin::-webkit-scrollbar {
                    width: 4px;
                }

                .scrollbar-thin::-webkit-scrollbar-track {
                    background: #f1f5f9;
                    border-radius: 2px;
                }

                .scrollbar-thin::-webkit-scrollbar-thumb {
                    background: #f8b4cb;
                    border-radius: 2px;
                }

                .scrollbar-thin::-webkit-scrollbar-thumb:hover {
                    background: #ec4899;
                }

                /* Enhanced Chatbox Body Styles */
                .chatbox-body {
                    scroll-behavior: smooth;
                    overscroll-behavior: contain;
                    -webkit-overflow-scrolling: touch;
                }

                .chatbox-body::-webkit-scrollbar {
                    width: 6px;
                }

                .chatbox-body::-webkit-scrollbar-track {
                    background: #f1f5f9;
                    border-radius: 4px;
                }

                .chatbox-body::-webkit-scrollbar-thumb {
                    background-color: #ec4899;
                    border-radius: 4px;
                    transition: background-color 0.2s ease;
                }

                .chatbox-body::-webkit-scrollbar-thumb:hover {
                    background-color: #be185d;
                }

                /* Message animations */
                .message-enter {
                    animation: messageSlideIn 0.4s ease-out;
                }

                @keyframes messageSlideIn {
                    from {
                        opacity: 0;
                        transform: translateX(-20px) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0) scale(1);
                    }
                }

                .user-message-enter {
                    animation: userMessageSlideIn 0.4s ease-out;
                }

                @keyframes userMessageSlideIn {
                    from {
                        opacity: 0;
                        transform: translateX(20px) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0) scale(1);
                    }
                }

                /* Enhanced Mobile responsiveness */
                @media (max-width: 480px) {
                    .chat-window {
                        width: calc(100vw - 1rem) !important;
                        height: calc(100vh - 4rem) !important;
                        max-height: calc(100vh - 4rem) !important;
                        bottom: 0.5rem !important;
                        left: 0.5rem !important;
                        border-radius: 1rem;
                    }

                    .chatbox-body {
                        padding: 0.75rem;
                    }

                    .chat-toggle-button {
                        width: 56px;
                        height: 56px;
                    }

                    #vevaha-chat-widget {
                        bottom: 1rem;
                        left: 1rem;
                    }
                }

                @media (max-width: 320px) {
                    .chat-window {
                        width: calc(100vw - 0.5rem) !important;
                        left: 0.25rem !important;
                    }

                    .chatbox-body {
                        padding: 0.5rem;
                    }
                }

                /* Focus styles for accessibility */
                .chat-toggle-button:focus {
                    outline: none;
                    box-shadow: 0 0 0 3px rgba(255, 38, 126, 0.5);
                }

                #close-chat-btn:focus,
                #send-btn:focus,
                #message-input:focus {
                    outline: none;
                }
            </style>
        `;

        // Insert widget into page
        document.body.insertAdjacentHTML('beforeend', widgetHTML);

        // Bind events
        this.bindEvents();
    }

    bindEvents() {
        const toggleBtn = document.getElementById('chat-toggle-btn');

        // Toggle chat - now redirects to VevahaAI page
        if (toggleBtn) {
            toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.openVevahaAIPage();
            });

            // Keyboard accessibility
            toggleBtn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    this.openVevahaAIPage();
                }
            });
        }
    }

    openVevahaAIPage() {
        // Redirect to VevahaAI page
        window.location.href = '/vevaha-ai.html';
    }

    async loadConversationStarters() {
        // Placeholder for conversation starters
        console.log('VevahaAI ready');
    }
}

// Prevent duplicate initialization
if (!window.VevahaAI) {
    // Initialize the widget when the script loads
    document.addEventListener('DOMContentLoaded', function() {
        if (!window.vevahaAI) {
            window.vevahaAI = new VevahaAI();
        }
    });

    // Also initialize immediately if DOM is already loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initVevahaAI);
    } else {
        initVevahaAI();
    }

    function initVevahaAI() {
        if (!window.vevahaAI) {
            window.vevahaAI = new VevahaAI();
        }
    }
}

// Make VevahaAI globally available
window.VevahaAI = VevahaAI;
