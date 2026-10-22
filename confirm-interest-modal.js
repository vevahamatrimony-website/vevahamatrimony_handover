/**
 * Confirm Interest Modal Component
 * Handles the secure flow for revealing contact information
 */

class ConfirmInterestModal {
    constructor() {
        this.currentProfileId = null;
        this.currentProfileName = null;
        this.init();
    }

    init() {
        // Create modal HTML if it doesn't exist
        if (!document.getElementById('confirmInterestModal')) {
            this.createModalHTML();
        }
    }

    createModalHTML() {
        const modalHTML = `
<!-- Confirm Interest Modal -->
<div id="confirmInterestModal" class="hidden fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <!-- Background overlay -->
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onclick="window.confirmInterestModal.close()"></div>

        <!-- Center content -->
        <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <!-- Modal panel -->
        <div class="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
            <div>
                <!-- Icon -->
                <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-pink-100">
                    <i class="fas fa-heart text-pink-600 text-2xl"></i>
                </div>

                <!-- Content -->
                <div class="mt-3 text-center sm:mt-5">
                    <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                        Confirm Your Interest
                    </h3>
                    <div class="mt-2">
                        <p class="text-sm text-gray-500" id="confirmInterestMessage">
                            Do you want to confirm your interest in this profile?
                        </p>
                        <p class="text-sm font-semibold text-pink-600 mt-2" id="confirmInterestProfileName"></p>
                    </div>
                </div>
            </div>

            <!-- Action buttons -->
            <div class="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button type="button" 
                        onclick="window.confirmInterestModal.handleAccept()"
                        id="acceptInterestBtn"
                        class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:col-start-2 sm:text-sm">
                    <i class="fas fa-check mr-2"></i>
                    Accept
                </button>
                <button type="button" 
                        onclick="window.confirmInterestModal.handleReject()"
                        id="rejectInterestBtn"
                        class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 sm:mt-0 sm:col-start-1 sm:text-sm">
                    <i class="fas fa-times mr-2"></i>
                    Reject
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Contact Revealed Modal -->
<div id="contactRevealedModal" class="hidden fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <!-- Background overlay -->
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onclick="window.confirmInterestModal.closeContactModal()"></div>

        <!-- Center content -->
        <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <!-- Modal panel -->
        <div class="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
            <div>
                <!-- Icon -->
                <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                    <i class="fas fa-check-circle text-green-600 text-2xl"></i>
                </div>

                <!-- Content -->
                <div class="mt-3 text-center sm:mt-5">
                    <h3 class="text-lg leading-6 font-medium text-gray-900">
                        Contact Details Revealed!
                    </h3>
                    <div class="mt-4">
                        <p class="text-sm text-gray-500 mb-3" id="revealedProfileName"></p>
                        
                        <!-- Phone number display (masked until clicked) -->
                        <div class="bg-pink-50 rounded-lg p-4 mb-4">
                            <p class="text-sm text-gray-600 mb-2">Phone Number:</p>
                            <div class="flex items-center justify-center">
                                <span id="maskedPhone" class="text-2xl font-bold text-pink-600 mr-3">••••••••••</span>
                                <button onclick="window.confirmInterestModal.revealPhone()" 
                                        id="showPhoneBtn"
                                        class="bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 transition-colors">
                                    <i class="fas fa-eye mr-2"></i>Show
                                </button>
                            </div>
                            <p id="actualPhone" class="text-2xl font-bold text-pink-600 hidden mt-2"></p>
                        </div>

                        <!-- Contact action buttons -->
                        <div id="contactActions" class="hidden space-y-3">
                            <button id="whatsappContactBtn" 
                                    class="w-full bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center">
                                <i class="fab fa-whatsapp text-2xl mr-2"></i>
                                <span class="font-semibold">Open WhatsApp</span>
                            </button>
                            <button id="callContactBtn" 
                                    class="w-full bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center">
                                <i class="fas fa-phone text-xl mr-2"></i>
                                <span class="font-semibold">Call Now</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Close button -->
            <div class="mt-5 sm:mt-6">
                <button type="button" 
                        onclick="window.confirmInterestModal.closeContactModal()"
                        class="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 sm:text-sm">
                    Close
                </button>
            </div>
        </div>
    </div>
</div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    /**
     * Show the confirm interest modal
     */
    show(profileId, profileName) {
        this.currentProfileId = profileId;
        this.currentProfileName = profileName;

        const modal = document.getElementById('confirmInterestModal');
        const nameElement = document.getElementById('confirmInterestProfileName');
        
        if (nameElement) {
            nameElement.textContent = profileName || 'this profile';
        }

        if (modal) {
            modal.classList.remove('hidden');
            // Add animation
            setTimeout(() => {
                modal.querySelector('.inline-block').classList.add('scale-100', 'opacity-100');
            }, 10);
        }
    }

    /**
     * Close the confirm interest modal
     */
    close() {
        const modal = document.getElementById('confirmInterestModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    /**
     * Handle Accept action
     */
    async handleAccept() {
        if (!this.currentProfileId) {
            this.showToast('Error: Profile ID not found', 'error');
            return;
        }

        // Disable buttons
        const acceptBtn = document.getElementById('acceptInterestBtn');
        const rejectBtn = document.getElementById('rejectInterestBtn');
        
        if (acceptBtn) acceptBtn.disabled = true;
        if (rejectBtn) rejectBtn.disabled = true;
        
        if (acceptBtn) {
            acceptBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...';
        }

        try {
            // Get user ID from localStorage
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            const userId = userData.id;

            const response = await fetch('/api/confirm-interest', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Id': userId
                },
                body: JSON.stringify({
                    profileId: this.currentProfileId,
                    action: 'accept',
                    userId: userId
                })
            });

            const data = await response.json();

            if (data.success) {
                this.close();
                
                if (data.showPhone) {
                    // Reveal phone number
                    this.showContactModal(data.phone, data.profileName);
                    this.showToast('Contact details revealed!', 'success');
                } else if (data.redirectTo) {
                    // Redirect to messages
                    this.showToast('Redirecting to messages...', 'success');
                    setTimeout(() => {
                        window.location.href = data.redirectTo;
                    }, 1500);
                }
            } else {
                this.showToast(data.message || 'Failed to confirm interest', 'error');
                
                if (data.upgradeRequired) {
                    setTimeout(() => {
                        window.location.href = '/membership.html';
                    }, 2000);
                }
            }
        } catch (error) {
            console.error('Confirm interest error:', error);
            this.showToast('Failed to process request', 'error');
        } finally {
            // Re-enable buttons
            if (acceptBtn) {
                acceptBtn.disabled = false;
                acceptBtn.innerHTML = '<i class="fas fa-check mr-2"></i>Accept';
            }
            if (rejectBtn) rejectBtn.disabled = false;
        }
    }

    /**
     * Handle Reject action
     */
    async handleReject() {
        if (!this.currentProfileId) {
            this.showToast('Error: Profile ID not found', 'error');
            return;
        }

        try {
            // Get user ID from localStorage
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            const userId = userData.id;

            const response = await fetch('/api/confirm-interest', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Id': userId
                },
                body: JSON.stringify({
                    profileId: this.currentProfileId,
                    action: 'reject',
                    userId: userId
                })
            });

            const data = await response.json();

            if (data.success) {
                this.close();
                this.showToast('Profile declined', 'info');
            } else {
                this.showToast(data.message || 'Failed to decline', 'error');
            }
        } catch (error) {
            console.error('Decline error:', error);
            this.showToast('Failed to decline', 'error');
        }
    }

    /**
     * Show contact modal with revealed phone number
     */
    showContactModal(phone, profileName) {
        const modal = document.getElementById('contactRevealedModal');
        const nameElement = document.getElementById('revealedProfileName');
        const actualPhoneElement = document.getElementById('actualPhone');

        if (nameElement) {
            nameElement.textContent = profileName || 'Profile';
        }

        // Store phone for later reveal
        if (actualPhoneElement) {
            actualPhoneElement.textContent = phone;
            actualPhoneElement.dataset.phone = phone;
        }

        // Setup contact buttons
        const whatsappBtn = document.getElementById('whatsappContactBtn');
        const callBtn = document.getElementById('callContactBtn');

        if (whatsappBtn) {
            whatsappBtn.onclick = () => {
                const cleanPhone = phone.replace(/[^0-9]/g, '');
                window.open(`https://wa.me/${cleanPhone}`, '_blank');
            };
        }

        if (callBtn) {
            callBtn.onclick = () => {
                window.location.href = `tel:${phone}`;
            };
        }

        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    /**
     * Reveal the actual phone number
     */
    revealPhone() {
        const maskedPhone = document.getElementById('maskedPhone');
        const actualPhone = document.getElementById('actualPhone');
        const showBtn = document.getElementById('showPhoneBtn');
        const contactActions = document.getElementById('contactActions');

        if (maskedPhone) maskedPhone.classList.add('hidden');
        if (actualPhone) actualPhone.classList.remove('hidden');
        if (showBtn) showBtn.classList.add('hidden');
        if (contactActions) contactActions.classList.remove('hidden');

        this.showToast('Phone number revealed!', 'success');
    }

    /**
     * Close contact modal
     */
    closeContactModal() {
        const modal = document.getElementById('contactRevealedModal');
        if (modal) {
            modal.classList.add('hidden');
        }

        // Reset modal state
        const maskedPhone = document.getElementById('maskedPhone');
        const actualPhone = document.getElementById('actualPhone');
        const showBtn = document.getElementById('showPhoneBtn');
        const contactActions = document.getElementById('contactActions');

        if (maskedPhone) maskedPhone.classList.remove('hidden');
        if (actualPhone) actualPhone.classList.add('hidden');
        if (showBtn) showBtn.classList.remove('hidden');
        if (contactActions) contactActions.classList.add('hidden');
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500'
        };

        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 
                          transform transition-all duration-300 translate-x-full`;
        toast.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'} mr-2"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 100);

        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize global instance
if (typeof window !== 'undefined') {
    window.confirmInterestModal = new ConfirmInterestModal();
}

// Helper function to show confirm interest modal from anywhere
window.showConfirmInterestModal = function(profileId, profileName) {
    if (window.confirmInterestModal) {
        window.confirmInterestModal.show(profileId, profileName);
    }
};
