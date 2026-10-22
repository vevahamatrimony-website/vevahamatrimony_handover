
<line_number>1</line_number>
// Communication System for VevahaMatrimony
// Handles messaging, voice calls, and video calls with plan-based restrictions

class CommunicationSystem {
    constructor() {
        this.validator = window.membershipValidator;
        this.init();
    }

    init() {
        this.setupMessageSystem();
        this.setupCallSystem();
        this.bindEvents();
    }

    // Setup messaging system
    setupMessageSystem() {
        const messageButtons = document.querySelectorAll('.message-btn, .send-message-btn');
        messageButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleMessageClick(e));
        });

        const messageInputs = document.querySelectorAll('.message-input');
        messageInputs.forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage(e.target);
                }
            });
        });
    }

    // Setup call system
    setupCallSystem() {
        const voiceButtons = document.querySelectorAll('.voice-call-btn');
        const videoButtons = document.querySelectorAll('.video-call-btn');

        voiceButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleVoiceCall(e));
        });

        videoButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleVideoCall(e));
        });

        // Hide call buttons based on user plan
        this.updateCallButtonVisibility();
    }

    // Handle message button click
    handleMessageClick(event) {
        const button = event.target.closest('button');
        const targetUserId = button.dataset.userId;
        const targetUserPlan = button.dataset.userPlan;

        if (!this.validator) {
            this.showError('System not initialized. Please refresh the page.');
            return;
        }

        const canMessage = this.validator.canSendMessage(targetUserPlan);
        
        if (!canMessage.allowed) {
            this.showMessageRestriction(canMessage.reason, targetUserPlan);
            return;
        }

        // Open message modal or redirect to messaging page
        this.openMessageInterface(targetUserId, targetUserPlan);
    }

    // Send message
    async sendMessage(input) {
        const messageText = input.value.trim();
        const targetUserId = input.dataset.targetUser;
        const targetUserPlan = input.dataset.targetUserPlan;

        if (!messageText) {
            this.showError('Please enter a message');
            return;
        }

        const canMessage = this.validator.canSendMessage(targetUserPlan);
        if (!canMessage.allowed) {
            this.showMessageRestriction(canMessage.reason, targetUserPlan);
            return;
        }

        try {
            // Send message to server
            const response = await fetch('/api/send-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    recipientId: targetUserId,
                    message: messageText,
                    timestamp: new Date().toISOString()
                })
            });

            if (response.ok) {
                // Increment message count for Gold users
                const validation = this.validator.validateMembership();
                if (validation.plan === 'gold') {
                    this.validator.incrementMessageCount();
                }

                // Clear input and show success
                input.value = '';
                this.showSuccess('Message sent successfully!');
                
                // Update message count display
                this.updateMessageCountDisplay();
            } else {
                throw new Error('Failed to send message');
            }
        } catch (error) {
            console.error('Message send error:', error);
            this.showError('Failed to send message. Please try again.');
        }
    }

    // Handle voice call
    handleVoiceCall(event) {
        const button = event.target.closest('button');
        const targetUserId = button.dataset.userId;
        const targetUserPlan = button.dataset.userPlan;

        const canCall = this.validator.canMakeCall(targetUserPlan);
        
        if (!canCall.allowed) {
            this.showCallRestriction(canCall.reason, 'voice');
            return;
        }

        // Open voice call interface
        this.initiateVoiceCall(targetUserId);
    }

    // Handle video call
    handleVideoCall(event) {
        const button = event.target.closest('button');
        const targetUserId = button.dataset.userId;
        const targetUserPlan = button.dataset.userPlan;

        const canCall = this.validator.canMakeCall(targetUserPlan);
        
        if (!canCall.allowed) {
            this.showCallRestriction(canCall.reason, 'video');
            return;
        }

        // Open video call interface
        this.initiateVideoCall(targetUserId);
    }

    // Update call button visibility based on user plan
    updateCallButtonVisibility() {
        if (!this.validator) return;

        const validation = this.validator.validateMembership();
        const userPlan = validation.plan;

        const callButtons = document.querySelectorAll('.voice-call-btn, .video-call-btn');
        
        callButtons.forEach(btn => {
            const targetUserPlan = btn.dataset.userPlan;
            
            // Show buttons only for Diamond users calling other Diamond users
            if (userPlan === 'diamond' && targetUserPlan === 'diamond') {
                btn.classList.remove('hidden');
            } else {
                btn.classList.add('hidden');
            }
        });

        // Show upgrade message for non-Diamond users
        if (!['diamond', 'vip'].includes(userPlan)) {
            this.showCallUpgradePrompt();
        }
    }

    // Show message restriction modal
    showMessageRestriction(reason, targetUserPlan) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
        modal.innerHTML = `
            <div class="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
                <div class="text-center">
                    <div class="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-comment-slash text-yellow-600 text-2xl"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-gray-800 mb-2">Messaging Restricted</h3>
                    <p class="text-gray-600 mb-6">${reason}</p>
                    ${this.getUpgradeButtons('messaging')}
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Auto-remove after 5 seconds
        setTimeout(() => modal.remove(), 5000);
    }

    // Show call restriction modal
    showCallRestriction(reason, callType) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
        modal.innerHTML = `
            <div class="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
                <div class="text-center">
                    <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-phone-slash text-blue-600 text-2xl"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-gray-800 mb-2">${callType} Call Restricted</h3>
                    <p class="text-gray-600 mb-6">${reason}</p>
                    ${this.getUpgradeButtons('calling')}
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Auto-remove after 5 seconds
        setTimeout(() => modal.remove(), 5000);
    }

    // Get upgrade buttons HTML
    getUpgradeButtons(feature) {
        const validation = this.validator.validateMembership();
        const userPlan = validation.plan;

        if (feature === 'messaging' && userPlan === 'silver') {
            return `
                <div class="space-y-3">
                    <button onclick="window.location.href='payment.html?plan=gold'" 
                            class="w-full bg-yellow-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-yellow-600 transition">
                        Upgrade to Gold Plan
                    </button>
                    <button onclick="this.closest('.fixed').remove()" 
                            class="w-full border border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-50 transition">
                        Maybe Later
                    </button>
                </div>
            `;
        } else if (feature === 'calling') {
            return `
                <div class="space-y-3">
                    <button onclick="window.location.href='payment.html?plan=diamond'" 
                            class="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition">
                        Upgrade to Diamond Plan
                    </button>
                    <button onclick="this.closest('.fixed').remove()" 
                            class="w-full border border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-50 transition">
                        Maybe Later
                    </button>
                </div>
            `;
        }

        return `
            <button onclick="this.closest('.fixed').remove()" 
                    class="w-full border border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-50 transition">
                Close
            </button>
        `;
    }

    // Open message interface
    openMessageInterface(targetUserId, targetUserPlan) {
        // Create or open messaging modal
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
        modal.innerHTML = `
            <div class="bg-white rounded-2xl w-full max-w-md mx-4 shadow-2xl max-h-96 flex flex-col">
                <div class="p-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 class="text-lg font-semibold text-gray-800">Send Message</h3>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="p-4 flex-1">
                    <textarea 
                        class="w-full p-3 border border-gray-300 rounded-lg resize-none message-input"
                        placeholder="Type your message..."
                        rows="4"
                        data-target-user="${targetUserId}"
                        data-target-user-plan="${targetUserPlan}"
                        maxlength="500"
                    ></textarea>
                    <div class="flex justify-between items-center mt-2 text-sm text-gray-500">
                        <span class="char-count">0/500</span>
                        ${this.getMessageLimitDisplay()}
                    </div>
                </div>
                <div class="p-4 border-t border-gray-200">
                    <button onclick="communicationSystem.sendMessage(this.parentElement.parentElement.querySelector('.message-input'))" 
                            class="w-full bg-pink-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-pink-700 transition">
                        Send Message
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Setup character counter
        const textarea = modal.querySelector('textarea');
        const charCount = modal.querySelector('.char-count');
        textarea.addEventListener('input', () => {
            charCount.textContent = `${textarea.value.length}/500`;
        });

        // Focus on textarea
        setTimeout(() => textarea.focus(), 100);
    }

    // Get message limit display
    getMessageLimitDisplay() {
        const validation = this.validator.validateMembership();
        if (validation.plan === 'gold') {
            const dailyCount = this.validator.getDailyMessageCount();
            return `<span class="text-blue-600">${dailyCount}/10 messages today</span>`;
        }
        return '';
    }

    // Update message count display
    updateMessageCountDisplay() {
        const displays = document.querySelectorAll('.message-count-display');
        const dailyCount = this.validator.getDailyMessageCount();
        
        displays.forEach(display => {
            display.textContent = `${dailyCount}/10 messages today`;
        });
    }

    // Initiate voice call
    initiateVoiceCall(targetUserId) {
        // Record call attempt
        this.recordCallAttempt(targetUserId, 'voice');
        
        // Open voice call page
        window.open;
    }

    // Initiate video call
    initiateVideoCall(targetUserId) {
        // Record call attempt
        this.recordCallAttempt(targetUserId, 'video');
        
        // Open video call page
        window.open;
    }

    // Record call attempt for analytics
    recordCallAttempt(targetUserId, callType) {
        const callData = {
            targetUserId,
            callType,
            timestamp: new Date().toISOString(),
            userPlan: this.validator.validateMembership().plan
        };

        // Store locally
        const callHistory = JSON.parse(localStorage.getItem('callHistory') || '[]');
        callHistory.push(callData);
        localStorage.setItem('callHistory', JSON.stringify(callHistory));

        // Send to server for analytics
        fetch('/api/record-call-attempt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(callData)
        }).catch(console.error);
    }

    // Show call upgrade prompt
    showCallUpgradePrompt() {
        const upgradePrompt = document.createElement('div');
        upgradePrompt.className = 'bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 call-upgrade-prompt';
        upgradePrompt.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-phone text-blue-600 mr-3"></i>
                <div class="flex-1">
                    <div class="font-semibold text-blue-800">Voice & Video Calls Available</div>
                    <div class="text-sm text-blue-600">Upgrade to Diamond plan to make voice and video calls</div>
                </div>
                <button onclick="window.location.href='membership.html'" 
                        class="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 transition">
                    Upgrade
                </button>
            </div>
        `;

        // Insert before main content
        const mainContent = document.querySelector('main, .main-content, #mainContent');
        if (mainContent) {
            mainContent.prepend(upgradePrompt);
        }
    }

    // Bind additional events
    bindEvents() {
        // Handle page visibility change to validate membership
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.validator) {
                this.validator.validateMembership();
                this.updateCallButtonVisibility();
            }
        });

        // Handle storage changes (if user upgrades in another tab)
        window.addEventListener('storage', (e) => {
            if (e.key === 'userData' && this.validator) {
                this.validator.validateMembership();
                this.updateCallButtonVisibility();
            }
        });
    }

    // Utility functions
    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type) {
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`;
        toast.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-${type === 'success' ? 'check' : 'exclamation-triangle'} mr-2"></i>
                <span>${message}</span>
            </div>
        `;
        document.body.appendChild(toast);

        setTimeout(() => toast.remove(), 3000);
    }
}

// Initialize communication system
let communicationSystem;

document.addEventListener('DOMContentLoaded', function() {
    // Wait for membership validator to be ready
    setTimeout(() => {
        communicationSystem = new CommunicationSystem();
    }, 500);
});

// Make communication system available globally
window.CommunicationSystem = CommunicationSystem;
window.communicationSystem = communicationSystem;
