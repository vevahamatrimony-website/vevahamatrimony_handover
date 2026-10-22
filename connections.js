// connections.js
// Handles fetching and displaying mutually accepted connections

// ─────────────────────────────────────────────
// GLOBAL FUNCTIONS FOR NAVBAR
// ─────────────────────────────────────────────

// Handle logout
window.handleLogout = async function () {
    if (window.VM && window.VM.auth) {
        await window.VM.auth.logout();
    } else {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = 'login.html';
    }
};

// Handle online/offline toggle
window.handleOnlineToggleClick = async function () {
    try {
        const currentStatus = VMAuth.user()?.is_manually_online !== false;
        const newStatus = !currentStatus;

        // Call centralized API method (handles localStorage sync)
        const result = await VM.profile.setOnlineStatus(newStatus);

        if (!result || !result.ok) {
            throw new Error('Failed to update status');
        }

        // Update UI
        updateOnlineStatusUI(newStatus);

        // Show toast notification
        VM.toast;
    } catch (error) {
        console.error('Error updating status:', error);
        VM.toast('Failed to update status', 'error');
    }
};

// Update online status UI
function updateOnlineStatusUI(isOnline) {
    const badge = document.getElementById('onlineStatusBadge');
    const button = document.getElementById('onlineToggleBtn');
    const slider = document.getElementById('toggleSlider');

    if (badge) {
        badge.textContent = isOnline ? 'Online' : 'Offline';
    }

    if (button && slider) {
        if (isOnline) {
            button.style.backgroundColor = '#22c55e';
            slider.style.marginLeft = '0.125rem';
        } else {
            button.style.backgroundColor = '#9ca3af';
            slider.style.marginLeft = '1.625rem';
        }
    }
}

// Initialize online status on page load
function initializeOnlineStatus() {
    setTimeout(() => {
        const user = VMAuth.user();
        const isOnline = user?.is_manually_online !== false;
        updateOnlineStatusUI(isOnline);
    }, 500);
}

// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeOnlineStatus);
} else {
    initializeOnlineStatus();
}

document.addEventListener('DOMContentLoaded', () => {
    // Auth Check
    if (!window.VMAuth || !VMAuth.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }

    const connectionsGrid = document.getElementById('connectionsGrid');
    const connectionsCount = document.getElementById('connectionsCount');
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');

    // Modal elements
    const upgradeModal = document.getElementById('upgradeModal');
    const upgradeModalMessage = document.getElementById('upgradeModalMessage');

    // ─────────────────────────────────────────────
    // Load Connections
    // ─────────────────────────────────────────────
    async function loadConnections() {
        try {
            const token = localStorage.getItem('vm_token');
            const res = await fetch('/api/requests/connections', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await res.json();

            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    localStorage.removeItem('vm_token');
                    window.location.href = 'login.html?expired=true';
                    return;
                }
                throw new Error(data.error || 'Failed to fetch connections');
            }

            loadingState.classList.add('hidden');

            if (!data.connections || data.connections.length === 0) {
                emptyState.classList.remove('hidden');
                return;
            }

            renderConnections(data.connections);
            connectionsCount.textContent = data.connections.length;
            connectionsGrid.classList.remove('hidden');

        } catch (error) {
            console.error('Error fetching connections:', error);
            loadingState.classList.add('hidden');
            emptyState.classList.remove('hidden');
            emptyState.querySelector('h3').textContent = 'Error Loading Connections';
            emptyState.querySelector('p').textContent = error.message;
        }
    }

    // Helper to escape HTML attributes safely
    function escapeAttr(str) {
        if (!str) return '';
        return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    // Helper: Parse and clean phone numbers (handles comma/slash/space separated and concatenated digits)
    function extractPhoneNumbers(phoneStr, waStr) {
        const combined = [phoneStr, waStr].filter(Boolean).join(' , ');
        if (!combined.trim()) return [];
        const numbers = new Set();
        const parts = combined.split(/[,/|;\n]|\band\b|\bor\b/i);

        for (let part of parts) {
            let cleaned = part.trim();
            if (!cleaned) continue;
            const digits = cleaned.replace(/\D/g, '');
            if (digits.length === 20) {
                // Two 10-digit numbers concatenated together
                numbers.add(digits.substring(0, 10));
                numbers.add(digits.substring(10, 20));
            } else if (digits.length >= 10) {
                const last10 = digits.slice(-10);
                if (/^[6-9]\d{9}$/.test(last10)) {
                    numbers.add(last10);
                } else {
                    numbers.add(digits);
                }
            } else if (digits.length >= 7) {
                numbers.add(digits);
            }
        }

        if (numbers.size === 0) {
            const matches = combined.match(/[6-9]\d{9}/g);
            if (matches) matches.forEach(n => numbers.add(n));
        }

        return Array.from(numbers);
    }

    // Modal to ask user which number to contact when multiple numbers exist
    function showOfflineNumberModal({ userName, action, numbers }) {
        const existing = document.getElementById('offlineNumberModal');
        if (existing) existing.remove();

        const actionMeta = {
            message: {
                title: 'Select WhatsApp Number',
                badge: 'WhatsApp Message',
                icon: 'fab fa-whatsapp',
                iconBg: 'bg-green-100 text-green-600',
                primary: 'whatsapp',
                hint: 'Choose which number to message on WhatsApp:'
            },
            voice: {
                title: 'Select Number to Call',
                badge: 'Phone Call',
                icon: 'fas fa-phone-alt',
                iconBg: 'bg-blue-100 text-blue-600',
                primary: 'call',
                hint: 'Choose which number to call:'
            },
            video: {
                title: 'Select Number for Video Call',
                badge: 'WhatsApp Video',
                icon: 'fas fa-video',
                iconBg: 'bg-purple-100 text-purple-600',
                primary: 'whatsapp',
                hint: 'Choose which number for WhatsApp Video Call:'
            }
        };

        const meta = actionMeta[action] || actionMeta.message;

        const modal = document.createElement('div');
        modal.id = 'offlineNumberModal';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60 transition-opacity';
        modal.style.backdropFilter = 'blur(4px)';

        modal.innerHTML = `
            <div class="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-100 transform transition-all animate-in fade-in zoom-in-95">
                <div class="flex items-start justify-between pb-4 border-b border-gray-100">
                    <div class="flex items-center gap-3">
                        <div class="w-11 h-11 rounded-2xl ${meta.iconBg} flex items-center justify-center text-xl flex-shrink-0 shadow-sm">
                            <i class="${meta.icon}"></i>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h3 class="text-base font-bold text-gray-900">${meta.title}</h3>
                                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-pink-100 text-pink-700">Offline Member</span>
                            </div>
                            <p class="text-xs text-gray-500 mt-0.5">${meta.hint}</p>
                        </div>
                    </div>
                    <button onclick="document.getElementById('offlineNumberModal').remove()" class="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition">
                        <i class="fas fa-times text-base"></i>
                    </button>
                </div>

                <div class="py-4 space-y-3">
                    <p class="text-xs font-semibold text-gray-700">Found <span class="text-pink-600">${numbers.length} contact numbers</span> for <span class="text-gray-900 font-bold">${userName}</span>:</p>
                    ${numbers.map((num, i) => {
                        const waNum = num.length === 10 ? '91' + num : num;
                        const isWaPrimary = meta.primary === 'whatsapp';
                        return `
                        <div class="p-3.5 rounded-xl border border-gray-200 hover:border-pink-300 bg-gray-50/70 hover:bg-pink-50/20 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                            <div class="flex items-center gap-3">
                                <span class="w-7 h-7 rounded-full bg-white border border-gray-200 text-gray-700 text-xs font-bold flex items-center justify-center shadow-xs">${i + 1}</span>
                                <div>
                                    <span class="font-bold text-gray-900 text-sm tracking-wide">+91 ${num}</span>
                                    <span class="block text-[11px] text-gray-500">Contact Number ${i + 1}</span>
                                </div>
                            </div>
                            <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
                                <a href="tel:${num}" onclick="document.getElementById('offlineNumberModal').remove()" class="flex-1 sm:flex-initial text-center px-3 py-1.5 ${!isWaPrimary ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm' : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'} rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition">
                                    <i class="fas fa-phone-alt text-[11px]"></i> Call
                                </a>
                                <a href="https://wa.me/${waNum}" target="_blank" onclick="document.getElementById('offlineNumberModal').remove()" class="flex-1 sm:flex-initial text-center px-3 py-1.5 ${isWaPrimary ? 'bg-green-600 hover:bg-green-700 text-white shadow-sm' : 'bg-green-50 hover:bg-green-100 text-green-700 border border-green-200'} rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition">
                                    <i class="fab fa-whatsapp text-sm ${isWaPrimary ? 'text-white' : 'text-green-500'}"></i> WhatsApp
                                </a>
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>

                <div class="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span class="text-[11px] text-gray-400">Offline members are reached directly via Phone or WhatsApp</span>
                    <button onclick="document.getElementById('offlineNumberModal').remove()" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition">
                        Close
                    </button>
                </div>
            </div>
        `;

        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        document.body.appendChild(modal);
    }

    // Handler for offline members (Phone/WhatsApp routing)
    async function handleOfflineMemberContact(action, targetId, btn, userName, token) {
        let phoneStr = btn.getAttribute('data-user-phone') || '';
        let waStr = btn.getAttribute('data-user-whatsapp') || '';
        let numbers = extractPhoneNumbers(phoneStr, waStr);

        // Fallback fetch from contact API if no number embedded on button
        if (numbers.length === 0) {
            try {
                const memberId = btn.getAttribute('data-member-id') || targetId;
                const res = await fetch(`/api/requests/contact/${memberId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.mobile_number || data.phone || data.whatsapp) {
                    numbers = extractPhoneNumbers(data.mobile_number || data.phone, data.whatsapp);
                }
            } catch (e) {
                console.warn('Fallback contact fetch error:', e);
            }
        }

        if (numbers.length === 0) {
            VM.toast(`Contact number is not available for ${userName}.`, 'warning');
            return;
        }

        // If multiple numbers, ask user which number to contact
        if (numbers.length > 1) {
            showOfflineNumberModal({ userName, action, numbers });
            return;
        }

        // Exactly 1 number
        const num = numbers[0];
        const waNum = num.length === 10 ? '91' + num : num;

        if (action === 'message') {
            VM.toast(`Connecting with ${userName} on WhatsApp...`, 'info');
            setTimeout(() => {
                window.open(`https://wa.me/${waNum}`, '_blank');
            }, 300);
        } else if (action === 'video') {
            VM.toast(`Connecting with ${userName} for WhatsApp Video Call...`, 'info');
            setTimeout(() => {
                window.open(`https://wa.me/${waNum}`, '_blank');
            }, 300);
        } else if (action === 'voice') {
            VM.toast(`Calling ${userName} (+91 ${num})...`, 'info');
            setTimeout(() => {
                window.location.href = `tel:${num}`;
            }, 300);
        }
    }

    function renderConnections(connections) {
        connectionsGrid.innerHTML = '';

        // Show the count badge on desktop
        const countBadge = document.getElementById('countBadge');
        if (countBadge) countBadge.classList.remove('hidden');

        connections.forEach(conn => {
            // Backend returns { ...request_row, user: { id, member_id, full_name, ... } }
            const user = conn.user || {};
            const name = user.full_name || 'Member';
            const memberId = user.member_id || '';
            const userId = user.id || '';
            const pic = user.profile_picture_url
                ? user.profile_picture_url
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=ec4899&color=fff&size=128`;
            const details = [
                user.age ? user.age + ' Yrs' : '',
                user.education || '',
                user.city || ''
            ].filter(Boolean).join(' • ');

            // Offline member identification
            const isOfflineMember = Boolean(user.is_managed) || 
                String(userId).startsWith('offline_') || 
                String(conn.receiver_id || '').startsWith('offline_') ||
                String(conn.sender_id || '').startsWith('offline_');

            // Online status (registered members only)
            const online = !isOfflineMember && ((window.VM && VM.profile) ? VM.profile.isOnline(user.last_seen) : false);
            
            const onlineDot = isOfflineMember
                ? `<span class="absolute bottom-0 right-0 w-4 h-4 bg-purple-500 rounded-full border-2 border-white z-20" title="Offline Managed Profile"></span>`
                : (online
                    ? `<span class="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white pulse-online z-20" title="Online"></span>`
                    : `<span class="absolute bottom-0 right-0 w-4 h-4 bg-gray-400 rounded-full border-2 border-white z-20" title="Offline"></span>`);

            const statusBadge = isOfflineMember
                ? `<span class="text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5" style="background:#f5f3ff; color:#7c3aed; border:1px solid #ddd6fe;"><i class="fas fa-user-shield" style="font-size:9px;"></i> Managed Profile</span>`
                : (online
                    ? `<span class="status-online text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5"><i class="fas fa-circle text-green-500" style="font-size:7px;"></i> Online</span>`
                    : `<span class="status-offline text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5"><i class="fas fa-clock" style="font-size:9px;"></i> Offline</span>`);

            const connDate = new Date(conn.updated_at || conn.created_at).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric'
            });

            const rawPhones = [user.mobile_number, user.phone, user.whatsapp].filter(Boolean).join(', ');
            const extractedCardNumbers = extractPhoneNumbers(rawPhones);

            const isPhotoLocked = user.hide_photo === true || user.hide_photo === 'true';
            const card = document.createElement('div');
            card.className = 'connection-card';

            card.innerHTML = `
                <div class="p-5">
                    <div class="flex items-start gap-4">
                        <div class="relative flex-shrink-0">
                            <div class="avatar-ring">
                                <img src="${pic}" alt="${name}" style="${isPhotoLocked ? 'filter: blur(12px) grayscale(50%); clip-path: circle(50% at 50% 50%); -webkit-clip-path: circle(50% at 50% 50%); pointer-events: none;' : ''}" onerror="this.src='/images/placeholder-profile.svg'">
                            </div>
                            ${onlineDot}
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-start justify-between gap-2 mb-1">
                                <h3 class="text-lg font-bold text-gray-900 truncate hover:text-pink-600 cursor-pointer" onclick="if(window.fullProfileModal){window.fullProfileModal.open('${memberId}')}" title="${name}">${name}</h3>
                                ${statusBadge}
                            </div>
                            <p class="text-pink-500 text-xs font-semibold mb-1">${memberId}</p>
                            <p class="text-gray-500 text-sm truncate mb-2">${details || 'No details available'}</p>
                            <p class="text-xs font-medium flex items-center gap-1.5" style="color:#db2777;">
                                <i class="fas fa-handshake opacity-70"></i>
                                Connected on ${connDate}
                            </p>
                            ${extractedCardNumbers.length > 0 ? `
                            <div class="mt-3 bg-green-50 border border-green-200 px-3 py-2 rounded-xl flex items-center gap-2 w-full max-w-md shadow-sm">
                                <i class="fas fa-check-circle text-green-600 text-sm flex-shrink-0"></i>
                                <div class="text-left flex-1 min-w-0">
                                    <p class="text-xs text-green-700 font-semibold" style="margin:0 0 2px 0; line-height: 1.2; font-family: 'Poppins', sans-serif;">Contact Number${extractedCardNumbers.length > 1 ? 's' : ''}</p>
                                    <div class="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-bold text-green-800" style="margin:2px 0 0 0; line-height: 1.2; font-family: 'Poppins', sans-serif;">
                                        ${extractedCardNumbers.map((num, idx) => {
                                            const waNum = num.length === 10 ? '91' + num : num;
                                            return `
                                            <span class="inline-flex items-center gap-1.5">
                                                <a href="tel:${num}" class="hover:underline flex items-center gap-1" title="Call +91 ${num}"><i class="fas fa-phone-alt text-[10px] text-green-700"></i>${num}</a>
                                                <a href="https://wa.me/${waNum}" target="_blank" class="text-green-600 hover:text-green-700 inline-flex items-center" title="WhatsApp +91 ${num}"><i class="fab fa-whatsapp text-xs text-green-500"></i></a>
                                                ${idx < extractedCardNumbers.length - 1 ? '<span class="text-green-300 font-normal">|</span>' : ''}
                                            </span>
                                            `;
                                        }).join('')}
                                    </div>
                                </div>
                            </div>
                            ` : (user.mobile_number ? `
                            <div class="mt-3 bg-green-50 border border-green-200 px-3 py-2 rounded-xl flex items-center gap-2 w-max shadow-sm">
                                <i class="fas fa-check-circle text-green-600 text-sm"></i>
                                <div class="text-left">
                                    <p class="text-xs text-green-700 font-semibold" style="margin:0 0 3px 0; line-height: 1.2; font-family: 'Poppins', sans-serif;">Contact Number</p>
                                    <p class="text-xs font-bold text-green-800" style="margin:3px 0 0 0; line-height: 1.2; font-family: 'Poppins', sans-serif;">
                                        <a href="tel:${String(user.mobile_number).replace(/\D/g, '')}" class="hover:underline"><i class="fas fa-phone-alt mr-1"></i>${user.mobile_number}</a>
                                    </p>
                                </div>
                            </div>
                            ` : '')}
                        </div>
                    </div>
                </div>
                <div class="px-5 pb-5 flex flex-col gap-2">
                    <button onclick="if(window.fullProfileModal){window.fullProfileModal.open('${memberId}')}" 
                            class="w-full py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-sm border border-pink-200 hover:bg-pink-100"
                            style="background:#fdf2f8; color:#be185d;">
                        <i class="fas fa-id-card text-sm"></i> View Full Profile
                    </button>
                    <div class="flex gap-2">
                        <button onclick="handleAction('message', '${userId}', event)"
                                data-user-last-seen="${user.last_seen || ''}"
                                data-user-is-managed="${isOfflineMember}"
                                data-user-is-offline="${isOfflineMember}"
                                data-user-name="${escapeAttr(name)}"
                                data-user-phone="${escapeAttr(rawPhones)}"
                                data-user-whatsapp="${escapeAttr(user.whatsapp || '')}"
                                data-user-id="${userId}"
                                data-member-id="${memberId}"
                                class="btn-action btn-message flex-1">
                            <i class="fas fa-comment-dots"></i> Message
                        </button>
                        <button onclick="handleAction('voice', '${memberId}', event)" 
                                data-user-last-seen="${user.last_seen || ''}"
                                data-user-is-managed="${isOfflineMember}"
                                data-user-is-offline="${isOfflineMember}"
                                data-user-is-online="${online}"
                                data-user-name="${escapeAttr(name)}"
                                data-user-phone="${escapeAttr(rawPhones)}"
                                data-user-whatsapp="${escapeAttr(user.whatsapp || '')}"
                                data-user-id="${userId}"
                                data-member-id="${memberId}"
                                class="btn-action btn-audio flex-1">
                            <i class="fas fa-phone-alt"></i> Audio
                        </button>
                        <button onclick="handleAction('video', '${memberId}', event)" 
                                data-user-last-seen="${user.last_seen || ''}"
                                data-user-is-managed="${isOfflineMember}"
                                data-user-is-offline="${isOfflineMember}"
                                data-user-is-online="${online}"
                                data-user-name="${escapeAttr(name)}"
                                data-user-phone="${escapeAttr(rawPhones)}"
                                data-user-whatsapp="${escapeAttr(user.whatsapp || '')}"
                                data-user-id="${userId}"
                                data-member-id="${memberId}"
                                class="btn-action btn-video flex-1">
                            <i class="fas fa-video"></i> Video
                        </button>
                    </div>
                </div>
            `;

            connectionsGrid.appendChild(card);
        });

    }

    // ─────────────────────────────────────────────
    // Modal Control Functions
    // ─────────────────────────────────────────────
    window.openUpgradeModal = function (message) {
        if (message) upgradeModalMessage.textContent = message;
        upgradeModal.classList.remove('hidden');
        setTimeout(() => {
            upgradeModal.classList.remove('opacity-0');
            upgradeModal.querySelector('div').classList.remove('scale-95');
            upgradeModal.querySelector('div').classList.add('scale-100');
        }, 10);
    };

    window.closeUpgradeModal = function () {
        upgradeModal.classList.add('opacity-0');
        upgradeModal.querySelector('div').classList.remove('scale-100');
        upgradeModal.querySelector('div').classList.add('scale-95');
        setTimeout(() => {
            upgradeModal.classList.add('hidden');
        }, 300);
    };

    // Close modal on outside click
    upgradeModal.addEventListener('click', (e) => {
        if (e.target === upgradeModal) {
            closeUpgradeModal();
        }
    });

    // ─────────────────────────────────────────────
    // Show offline modal (Legacy placeholder)
    // ─────────────────────────────────────────────
    window.showOfflineModal = function (userName) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        modal.style.background = 'rgba(0, 0, 0, 0.5)';

        modal.innerHTML = `
            <div class="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
                <div class="text-center">
                    <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-user-clock text-4xl text-gray-400"></i>
                    </div>
                    <h3 class="text-xl font-bold text-gray-800 mb-2">${userName} is Offline</h3>
                    <p class="text-gray-600 mb-6">This user is currently offline. You can contact them via WhatsApp instead.</p>
                    <div class="flex gap-3">
                        <button onclick="this.closest('.fixed').remove()" class="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-semibold hover:bg-gray-300 transition">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    };

    // ─────────────────────────────────────────────
    // Handle Action Buttons - REAL CALLS & MESSAGING
    // ─────────────────────────────────────────────
    window.handleAction = async function (action, targetId, event) {
        try {
            const token = localStorage.getItem('vm_token');
            const featureAction = (action === 'message') ? 'message' : 'call';
            const btn = event.currentTarget;
            const userName = btn.getAttribute('data-user-name') || 'Member';
            const isOffline = btn.getAttribute('data-user-is-offline') === 'true' || 
                              btn.getAttribute('data-user-is-managed') === 'true' ||
                              String(targetId).startsWith('offline_');

            // Check membership first
            const res = await fetch('/api/membership/check', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: featureAction })
            });
            const result = await res.json();
            if (!result.allowed) {
                const messages = {
                    'message': "Messaging is a premium feature. Upgrade your plan to Gold or higher!",
                    'call': "Voice and Video calls are exclusive to Diamond/VIP members. Upgrade now!"
                };
                openUpgradeModal(messages[featureAction] || 'Feature requires upgrade');
                return;
            }

            // ───── OFFLINE / MANAGED MEMBERS (Direct WhatsApp / Phone routing) ─────
            if (isOffline) {
                await handleOfflineMemberContact(action, targetId, btn, userName, token);
                return;
            }

            // ───── REGISTERED USERS (Internal in-app tools) ─────
            if (action === 'message') {
                window.location.href = `messages.html?chat=${targetId}`;
                return;
            }

            // Check if online for WebRTC calls
            const lastSeen = btn.getAttribute('data-user-last-seen');
            const isOnlineFlag = btn.getAttribute('data-user-is-online') === 'true';
            const isOnline = (window.VM && VM.profile) ? VM.profile.isOnline(lastSeen) : isOnlineFlag;

            if (!isOnline) {
                // DON'T REDIRECT REGISTERED USERS TO WHATSAPP
                VM.toast(`${userName} is currently offline. Please try again later.`, 'warning');
                return;
            }

            // ───── PROCEED WITH WebRTC CALL (Online registered users only) ─────
            if (action === 'voice') {
                window.location.href = `voice-call.html?receiver=${targetId}`;
            } else if (action === 'video') {
                window.location.href = `video-call.html?receiver=${targetId}`;
            }

        } catch (err) {
            console.error("Error handling action:", err);
            VM.toast("Error: " + err.message, 'error');
        }
    };

    // Initial Load
    loadConnections();
});
