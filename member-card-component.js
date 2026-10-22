/**
 * Unified Member Card Component for VevahaMatrimony
 * Matches the exact design from provided image
 */

class MemberCard {
    constructor(member, options = {}) {
        this.member = member;
        this.options = {
            showViewMore: true,
            showActions: true,
            onInterest: null,
            onDecline: null,
            onViewMore: null,
            onWhatsApp: null,
            onCall: null,
            onShortlist: null,
            ...options
        };
    }

    /**
     * Generate matrimony ID
     */
    getMatrimonyId() {
        return this.member.matrimony_id || `VM${this.member.id?.substring(0, 8) || '00000000'}`;
    }

    /**
     * Format age from date of birth
     */
    getAge() {
        if (this.member.age) return this.member.age;
        if (!this.member.date_of_birth) return null;
        
        const dob = new Date(this.member.date_of_birth);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
            age--;
        }
        return age;
    }

    /**
     * Get one-line profile details
     * Display order: Age, Caste, Education, Job, City
     */
    getProfileDetails() {
        const details = [];
        
        const age = this.getAge();
        if (age) details.push(`${age} Yrs`);
        if (this.member.caste || this.member.subcaste) {
            details.push(this.member.subcaste || this.member.caste);
        }
        if (this.member.education) details.push(this.member.education);
        if (this.member.profession || this.member.employment_type) {
            details.push(this.member.profession || this.member.employment_type);
        }
        if (this.member.city) details.push(this.member.city);
        
        return details.length > 0 ? details.join(', ') : 'Profile details not available';
    }

    /**
     * Check if profile is locked
     */
    isLocked() {
        let currentUser = {};
        try {
            currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
        } catch (e) {}
        const isSelf = this.member.id === currentUser.id;
        if (isSelf) return false; // don't lock/blur own photo
        return this.member.hide_photo === true || 
               this.member.hide_photo === 'true' || 
               this.member.profile_photo_locked === true || 
               this.member.profile_photo_locked === 'true' || 
               false;
    }

    /**
     * Check if profile is verified
     * Show verified badge for admin-uploaded profiles or explicitly verified profiles
     */
    isVerified() {
        // Show verified badge if:
        // 1. Explicitly marked as verified
        // 2. Admin-uploaded profiles (they are pre-verified)
        // 3. Aadhaar verified profiles
        return this.member.is_verified === true || 
               this.member.source === 'admin' || 
               this.member.aadhaar_verified === true ||
               this.member.is_admin_uploaded === true;
    }

    /**
     * Check if profile is shortlisted
     */
    isShortlisted() {
        return this.member.is_shortlisted || false;
    }

    /**
     * Get profile photo URL
     */
    getPhotoUrl() {
        if (this.member.profile_photo) {
            return this.member.profile_photo;
        }
        // Default placeholder
        const gender = (this.member.gender || 'other').toLowerCase();
        return `https://via.placeholder.com/300x300/ec4899/ffffff?text=${this.member.full_name?.charAt(0) || 'U'}`;
    }

    /**
     * Check if contact actions should be enabled
     */
    canShowContact() {
        return true;
    }

    /**
     * Render the member card HTML
     */
    render() {
        const matrimonyId = this.getMatrimonyId();
        const profileDetails = this.getProfileDetails();
        const photoUrl = this.getPhotoUrl();
        const isLocked = this.isLocked();
        const isVerified = this.isVerified();
        const isShortlisted = this.isShortlisted();
        const canShowContact = this.canShowContact();

        return `
<div class="member-card bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden" 
     data-member-id="${this.member.id || ''}"
     data-member-name="${this.member.full_name || ''}"
     style="background: #fdfdfc; border-radius: 15px; position: relative;">
    
    <!-- Top Right Icons -->
    <div class="absolute top-3 right-3 flex flex-col gap-2 z-10">
        ${isVerified ? `
        <div class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shadow-md" title="Verified Profile">
            <i class="fas fa-check text-white text-sm"></i>
        </div>
        ` : ''}
        
        <button class="shortlist-btn w-8 h-8 rounded-full ${isShortlisted ? 'bg-pink-500' : 'bg-pink-400'} 
                       flex items-center justify-center shadow-md hover:bg-pink-600 transition-colors"
                onclick="handleShortlist(event, '${this.member.id}')"
                title="${isShortlisted ? 'Remove from shortlist' : 'Add to shortlist'}">
            <i class="fas fa-bookmark text-white text-sm"></i>
        </button>
    </div>

    <!-- Profile Photo Circle -->
    <div class="flex justify-center pt-6 pb-3">
        <div class="relative">
            <div class="w-40 h-40 rounded-full overflow-hidden border-4 border-gray-200 bg-gray-100">
                <img src="${photoUrl}" 
                     alt="${this.member.full_name || 'Profile'}"
                     class="w-full h-full object-cover"
                     style="${isLocked ? 'filter: blur(12px) grayscale(50%); clip-path: circle(50% at 50% 50%); -webkit-clip-path: circle(50% at 50% 50%); pointer-events: none; -webkit-user-drag: none;' : ''}"
                     onerror="this.src='https://via.placeholder.com/300x300/ec4899/ffffff?text=${(this.member.full_name || 'U').charAt(0)}'">
            </div>
            
            ${isLocked ? `
            <div class="absolute bottom-1 right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center border-2 border-gray-300 shadow">
                <i class="fas fa-lock text-gray-600 text-xs"></i>
            </div>
            ` : ''}
        </div>
    </div>

    <!-- Profile Info -->
    <div class="px-4 pb-4">
        <!-- Name and Contact Icons Row -->
        <div class="flex items-center justify-between mb-1">
            <h3 class="text-xl font-bold text-gray-900 flex-1">
                ${this.member.full_name || 'Anonymous'}
            </h3>
            
            <!-- Contact Icons (WhatsApp & Call) -->
            <div class="flex gap-2">
                ${canShowContact ? `
                <button class="contact-icon whatsapp-btn w-9 h-9 rounded-full bg-green-500 flex items-center justify-center 
                               hover:bg-green-600 transition-colors shadow"
                        onclick="handleWhatsApp(event, '${this.member.id}')"
                        title="WhatsApp">
                    <i class="fab fa-whatsapp text-white text-base"></i>
                </button>
                <button class="contact-icon call-btn w-9 h-9 rounded-full bg-red-500 flex items-center justify-center 
                               hover:bg-red-600 transition-colors shadow"
                        onclick="handleCall(event, '${this.member.id}')"
                        title="Call">
                    <i class="fas fa-phone text-white text-base"></i>
                </button>
                ` : `
                <button class="contact-icon w-9 h-9 rounded-full bg-gray-400 flex items-center justify-center 
                               shadow cursor-not-allowed opacity-50"
                        onclick="showContactRestrictionToast()"
                        title="Please click Interest first">
                    <i class="fab fa-whatsapp text-white text-base"></i>
                </button>
                <button class="contact-icon w-9 h-9 rounded-full bg-gray-400 flex items-center justify-center 
                               shadow cursor-not-allowed opacity-50"
                        onclick="showContactRestrictionToast()"
                        title="Please click Interest first">
                    <i class="fas fa-phone text-white text-base"></i>
                </button>
                `}
            </div>
        </div>
        
        <!-- Matrimony ID -->
        <p class="text-pink-500 font-semibold text-sm mb-2">
            ${matrimonyId}
        </p>
        
        <!-- Details -->
        <p class="text-gray-700 text-sm leading-relaxed mb-3 min-h-[40px]">
            ${profileDetails || 'Profile details not available'}
        </p>

        <!-- VIEW MORE Link -->
        ${this.options.showViewMore ? `
        <div class="text-right mb-3">
            <a href="#" class="text-cyan-500 font-semibold text-sm hover:text-cyan-600 transition-colors"
               onclick="handleViewMore(event, '${this.member.id}')">
                VIEW MORE
            </a>
        </div>
        ` : ''}

        <!-- Action Buttons -->
        ${this.options.showActions ? `
        <div class="flex gap-3 mt-3">
            <button class="decline-btn flex-1 py-2.5 rounded-full border-2 border-red-500 text-red-500 
                           font-semibold hover:bg-red-50 transition-all duration-200 flex items-center justify-center gap-2"
                    onclick="handleDecline(event, '${this.member.id}')"
                    style="border-radius: 25px;">
                <span style="font-size: 18px;">😞</span>
                <span>Decline</span>
            </button>
            <button class="interest-btn flex-1 py-2.5 rounded-full border-2 border-green-500 text-green-500 
                           font-semibold hover:bg-green-50 transition-all duration-200 flex items-center justify-center gap-2"
                    onclick="handleInterest(event, '${this.member.id}')"
                    style="border-radius: 25px;">
                <span style="font-size: 18px;">💖</span>
                <span>Interest</span>
            </button>
        </div>
        ` : ''}
    </div>
</div>
        `;
    }
}

// Global handlers for card actions
window.handleShortlist = function(event, memberId) {
    event.preventDefault();
    event.stopPropagation();
    
    const btn = event.currentTarget;
    const isShortlisted = btn.classList.contains('bg-pink-500');
    
    // Toggle shortlist
    if (isShortlisted) {
        btn.classList.remove('bg-pink-500');
        btn.classList.add('bg-pink-400');
        btn.title = 'Add to shortlist';
        showToast('Removed from shortlist', 'info');
    } else {
        btn.classList.remove('bg-pink-400');
        btn.classList.add('bg-pink-500');
        btn.title = 'Remove from shortlist';
        showToast('Added to shortlist', 'success');
    }
    
    // Call API to update shortlist status
    fetch('/api/shortlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            memberId, 
            action: isShortlisted ? 'remove' : 'add' 
        })
    }).catch(err => console.error('Shortlist error:', err));
};

function extractPrimaryPhone(phoneStr) {
    if (!phoneStr) return '';
    const parts = phoneStr.split(',');
    for (let p of parts) {
        const clean = p.replace(/[^0-9]/g, '');
        if (clean.length >= 10) return clean;
    }
    return (phoneStr || '').replace(/[^0-9]/g, '');
}

window.handleWhatsApp = function(event, memberId) {
    event.preventDefault();
    event.stopPropagation();
    
    const token = localStorage.getItem('vm_token');
    if (!token) {
        showLoginPrompt('Please login to view contact details');
        return;
    }

    fetch(`/api/get-contact/${memberId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(res => {
            if (res.status === 401) {
                showLoginPrompt('Please login to view contact details');
                throw new Error('Authentication required');
            }
            return res.json();
        })
        .then(data => {
            if (data.is_unlocked && (data.phone || data.mobile_number)) {
                const rawPhone = data.phone || data.mobile_number;
                const phone = extractPrimaryPhone(rawPhone);
                if (phone) {
                    window.open(`https://wa.me/${phone}`, '_blank');
                    showToast('Opening WhatsApp...', 'success');
                } else {
                    showToast('Invalid contact number format', 'error');
                }
            } else {
                // Not unlocked yet: open full profile modal to view and unlock contact
                if (window.fullProfileModal && typeof window.fullProfileModal.open === 'function') {
                    window.fullProfileModal.open(memberId);
                } else if (typeof viewMemberProfile === 'function') {
                    viewMemberProfile(memberId);
                }
                showToast('Click "View Contact Details" in profile to unlock', 'info');
            }
        })
        .catch(err => {
            if (err.message !== 'Authentication required') {
                console.error('WhatsApp error:', err);
                if (window.fullProfileModal) window.fullProfileModal.open(memberId);
            }
        });
};

window.handleCall = function(event, memberId) {
    event.preventDefault();
    event.stopPropagation();
    
    const token = localStorage.getItem('vm_token');
    if (!token) {
        showLoginPrompt('Please login to view contact details');
        return;
    }

    fetch(`/api/get-contact/${memberId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(res => {
            if (res.status === 401) {
                showLoginPrompt('Please login to view contact details');
                throw new Error('Authentication required');
            }
            return res.json();
        })
        .then(data => {
            if (data.is_unlocked && (data.phone || data.mobile_number)) {
                const rawPhone = data.phone || data.mobile_number;
                const phone = extractPrimaryPhone(rawPhone);
                if (phone) {
                    window.location.href = `tel:${phone}`;
                    showToast('Initiating call...', 'success');
                } else {
                    showToast('Invalid contact number format', 'error');
                }
            } else {
                // Not unlocked yet: open full profile modal to view and unlock contact
                if (window.fullProfileModal && typeof window.fullProfileModal.open === 'function') {
                    window.fullProfileModal.open(memberId);
                } else if (typeof viewMemberProfile === 'function') {
                    viewMemberProfile(memberId);
                }
                showToast('Click "View Contact Details" in profile to unlock', 'info');
            }
        })
        .catch(err => {
            if (err.message !== 'Authentication required') {
                console.error('Call error:', err);
                if (window.fullProfileModal) window.fullProfileModal.open(memberId);
            }
        });
};

window.handleViewMore = function(event, memberId) {
    event.preventDefault();
    event.stopPropagation();
    
    if (window.fullProfileModal && typeof window.fullProfileModal.open === 'function') {
        window.fullProfileModal.open(memberId);
    } else if (typeof viewMemberProfile === 'function') {
        viewMemberProfile(memberId);
    } else {
        console.error('viewMemberProfile function not available');
        showToast('Failed to load profile - please refresh the page', 'error');
    }
};

window.handleDecline = function(event, memberId) {
    event.preventDefault();
    event.stopPropagation();
    
    if (confirm('Are you sure you want to decline this profile?')) {
        const card = event.currentTarget.closest('.member-card');
        if (card) {
            card.style.opacity = '0';
            setTimeout(() => card.remove(), 300);
        }
        showToast('Profile skipped', 'info');
    }
};

window.handleInterest = function(event, memberId) {
    event.preventDefault();
    event.stopPropagation();
    
    let currentUser = {};
    try { currentUser = JSON.parse(localStorage.getItem('userData') || localStorage.getItem('vm_user') || '{}'); } catch(e){}
    const userPlan = (currentUser.plan_name || 'free').toLowerCase();
    if (userPlan === 'free') {
        if (window.showUpgradeModal) {
            window.showUpgradeModal(
                'Upgrade Required to Express Interest',
                'Sending interest requests requires an active membership plan. Please upgrade to connect.',
                'Upgrade Plan'
            );
        } else {
            showToast('Sending interest requires an active membership plan.', 'warning');
            setTimeout(() => { window.location.href = 'membership.html'; }, 1500);
        }
        return;
    }

    const token = localStorage.getItem('vm_token');
    if (!token) {
        showLoginPrompt('Please login to send interest');
        return;
    }

    const btn = event.currentTarget;
    btn.disabled = true;

    fetch('/api/requests/send', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ receiver_id: memberId })
    })
    .then(async res => {
        const data = await res.json();
        if (!res.ok) {
            if (data.code === 'UPGRADE_REQUIRED' || res.status === 403) {
                if (window.showUpgradeModal) {
                    window.showUpgradeModal('Upgrade Required', data.error || data.message, 'Upgrade Plan');
                    btn.disabled = false;
                    return;
                }
            }
            throw new Error(data.error || 'Failed to send interest');
        }
        showToast('Interest sent successfully!', 'success');
        btn.classList.add('opacity-50');
        btn.innerHTML = '<span>✓</span><span>Interest Sent</span>';
    })
    .catch(err => {
        btn.disabled = false;
        console.error('Interest error:', err);
        showToast(err.message || 'Failed to send interest', 'error');
    });
};

window.showContactRestrictionToast = function() {
    showToast('Click VIEW MORE to view profile and unlock contact details', 'info');
};

// Toast notification helper
function showToast(message, type = 'info') {
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500'
    };
    
    const toast = document.createElement('div');
    toast.className = `fixed top-20 right-4 ${colors[type]} text-white px-6 py-3 rounded-xl shadow-2xl z-[999999] 
                      transform transition-all duration-300 translate-x-full`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.remove('translate-x-full');
    }, 100);
    
    setTimeout(() => {
        toast.classList.add('translate-x-full');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Login prompt for unauthenticated users
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
                Continue browsing
            </button>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Add animations
    const style = document.createElement('style');
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
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    });
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MemberCard;
}
