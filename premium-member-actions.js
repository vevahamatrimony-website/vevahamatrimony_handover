/**
 * Premium Member Actions Handler
 * Centralizes interaction logic for premium member cards in index.html and membership.html
 */

(function() {
    'use strict';

    /**
     * Check if user is logged in
     */
    function isUserLoggedIn() {
        const userData = localStorage.getItem('userData');
        const userSession = localStorage.getItem('userSession');
        return userData && userSession === 'active';
    }

    /**
     * Show login prompt modal
     */
    function showLoginPrompt(message = 'Please login to continue') {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        overlay.style.animation = 'fadeIn 0.3s ease-out';
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all';
        modal.style.animation = 'slideUp 0.3s ease-out';
        
        modal.innerHTML = `
            <div class="text-center">
                <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-pink-100 mb-4">
                    <i class="fas fa-user-lock text-pink-600 text-2xl"></i>
                </div>
                <h3 class="text-2xl font-bold text-gray-900 mb-2">Login Required</h3>
                <p class="text-gray-600 mb-6">${message}</p>
                <div class="flex gap-3">
                    <button onclick="window.location.href='login.html'" 
                            class="flex-1 bg-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-pink-700 transition-colors">
                        Login
                    </button>
                    <button onclick="window.location.href='register.html'" 
                            class="flex-1 border-2 border-pink-600 text-pink-600 px-6 py-3 rounded-lg font-semibold hover:bg-pink-50 transition-colors">
                        Register
                    </button>
                </div>
                <button onclick="this.closest('.fixed').remove()" 
                        class="mt-4 text-gray-500 hover:text-gray-700 text-sm">
                    Close
                </button>
            </div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });
    }

    /**
     * Show redirect to active members page modal
     */
    function showRedirectPrompt(message = 'Visit Active Members page to interact with profiles') {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        overlay.style.animation = 'fadeIn 0.3s ease-out';
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all';
        modal.style.animation = 'slideUp 0.3s ease-out';
        
        modal.innerHTML = `
            <div class="text-center">
                <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
                    <i class="fas fa-users text-blue-600 text-2xl"></i>
                </div>
                <h3 class="text-2xl font-bold text-gray-900 mb-2">Active Members</h3>
                <p class="text-gray-600 mb-6">${message}</p>
                <div class="flex flex-col gap-3">
                    <button onclick="window.location.href='active-members.html'" 
                            class="w-full bg-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-pink-700 transition-colors flex items-center justify-center gap-2">
                        <i class="fas fa-arrow-right"></i>
                        Go to Active Members
                    </button>
                    <button onclick="this.closest('.fixed').remove()" 
                            class="text-gray-500 hover:text-gray-700 text-sm">
                        Close
                    </button>
                </div>
            </div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });
    }

    /**
     * Handle premium member action
     */
    function showPremiumAction() {
        if (isUserLoggedIn()) {
            // User is logged in, redirect to active members
            showRedirectPrompt('These are premium showcase profiles. Visit Active Members page to view and interact with all profiles.');
        } else {
            // User not logged in, show login prompt
            showLoginPrompt('Please login or register to interact with member profiles');
        }
    }

    /**
     * Initialize premium member actions
     */
    function initPremiumMemberActions(rootSelector = 'body') {
        const root = document.querySelector(rootSelector);
        if (!root) return;

        // Add CSS animations if not already added
        if (!document.getElementById('premium-actions-styles')) {
            const style = document.createElement('style');
            style.id = 'premium-actions-styles';
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }

        console.log('✅ Premium member actions initialized');
    }

    // Export to global scope
    window.showPremiumAction = showPremiumAction;
    window.initPremiumMemberActions = initPremiumMemberActions;

    // Auto-initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            initPremiumMemberActions();
        });
    } else {
        initPremiumMemberActions();
    }
})();
