/**
 * Premium Gate System
 * Intercepts actions that require a membership plan and displays a gating modal.
 */
(function () {
    'use strict';

    const GATE_MESSAGES = {
        'view_contact': 'You need a Silver Plan or higher to view contact details.',
        'send_message': 'Messaging is a Gold Plan feature. Upgrade now to connect!',
        'voice_video': 'Voice and Video calls are available for Diamond members.',
        'concierge': 'VIP Concierge service is reserved for our VIP members.'
    };

    /**
     * Show gating modal
     */
    function showGateModal(feature) {
        const msg = GATE_MESSAGES[feature] || 'This feature requires a premium membership.';

        // Remove existing if any
        const existing = document.getElementById('premiumGateModal');
        if (existing) existing.remove();

        const modalHtml = `
            <div id="premiumGateModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden transform animate-in fade-in zoom-in duration-300">
                    <div class="bg-gradient-to-r from-pink-600 to-purple-600 p-8 text-center text-white">
                        <div class="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-crown text-3xl"></i>
                        </div>
                        <h3 class="text-2xl font-bold mb-2">Premium Feature</h3>
                        <p class="text-pink-100 opacity-90">${msg}</p>
                    </div>
                    <div class="p-8">
                        <div class="space-y-4 mb-8">
                            <div class="flex items-start gap-3">
                                <div class="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                                    <i class="fas fa-check text-pink-600 text-sm"></i>
                                </div>
                                <p class="text-gray-600 text-sm">Direct access to verified contact numbers and WhatsApp.</p>
                            </div>
                            <div class="flex items-start gap-3">
                                <div class="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                                    <i class="fas fa-check text-pink-600 text-sm"></i>
                                </div>
                                <p class="text-gray-600 text-sm">Unlimited personalized messages to your potential matches.</p>
                            </div>
                        </div>
                        <div class="flex flex-col gap-3">
                            <a href="membership.html" class="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-2xl font-bold text-center shadow-lg hover:shadow-xl transition-all active:scale-[0.98]">
                                View Membership Plans
                            </a>
                            <button onclick="document.getElementById('premiumGateModal').remove()" class="w-full py-3 text-gray-400 hover:text-gray-600 font-semibold transition-colors">
                                Maybe Later
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    /**
     * Apply gate to elements
     */
    function applyGates() {
        if (!window.VM || !window.VM.membership) return;

        // 1. Contact buttons (View Contact, Call)
        document.querySelectorAll('.btn-view-contact, .btn-call, [data-gate="view_contact"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (!VM.membership.canAccess('view_contact')) {
                    e.preventDefault();
                    e.stopPropagation();
                    showGateModal('view_contact');
                }
            }, true);
        });

        // 2. Message buttons
        document.querySelectorAll('.btn-message, [data-gate="send_message"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (!VM.membership.canAccess('send_message')) {
                    e.preventDefault();
                    e.stopPropagation();
                    showGateModal('send_message');
                }
            }, true);
        });

        // 3. Profiles that are gated
        document.querySelectorAll('.gated-profile-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!VM.membership.canAccess('view_contact')) {
                    e.preventDefault();
                    e.stopPropagation();
                    showGateModal('view_contact');
                }
            }, true);
        });
    }

    // Export to global
    window.VMPremiumGate = {
        show: showGateModal,
        refresh: applyGates
    };

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyGates);
    } else {
        applyGates();
    }
})();
