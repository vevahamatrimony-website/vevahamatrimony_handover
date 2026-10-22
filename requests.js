// requests.js
// Handles fetching sent and received match requests

document.addEventListener('DOMContentLoaded', () => {
    // Check if VM exists
    if (!window.VMAuth || !VMAuth.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }

    const sentCount = document.getElementById('sentCount');
    const receivedCount = document.getElementById('receivedCount');
    const sentList = document.getElementById('sentInterestsList');
    const receivedList = document.getElementById('receivedInterestsList');
    const noSent = document.getElementById('noSentInterests');
    const noReceived = document.getElementById('noReceivedInterests');

    // Safety check: ensure required elements exist
    if (!sentCount || !receivedCount || !sentList || !receivedList || !noSent || !noReceived) {
        console.warn('?? Some match request elements are missing from the DOM. Matching aborted.');
        return;
    }

    async function loadRequests() {
        console.log('[DEBUG] Loading requests for requests.html...');
        try {
            const token = localStorage.getItem('vm_token');
            // Fetch Received Requests
            const resReceived = await fetch('/api/requests/pending', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const dataReceived = await resReceived.json();
            console.log('[DEBUG] API Response for /pending:', dataReceived);
            if (resReceived.ok && dataReceived.requests) {
                renderReceivedRequests(dataReceived.requests);
            }
 
            // Fetch Sent Requests
            const resSent = await fetch('/api/requests/sent', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const dataSent = await resSent.json();
            console.log('[DEBUG] API Response for /sent:', dataSent);
            if (resSent.ok && dataSent.requests) {
                renderSentRequests(dataSent.requests);
            }

            // Fetch Declined Requests
            const resDeclined = await fetch('/api/requests/declined', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const dataDeclined = await resDeclined.json();
            console.log('[DEBUG] API Response for /declined:', dataDeclined);
            if (resDeclined.ok && dataDeclined.requests) {
                renderDeclinedRequests(dataDeclined.requests);
            }

        } catch (err) {
            console.error('Failed to load requests:', err);
        }
    }

    function renderReceivedRequests(requests) {
        receivedList.innerHTML = '';
        receivedCount.textContent = requests.length;

        if (requests.length === 0) {
            noReceived.classList.remove('hidden');
            return;
        }

        noReceived.classList.add('hidden');

        requests.forEach(req => {
            const card = document.createElement('div');
            card.className = 'bg-white p-4 rounded-xl shadow-sm border border-pink-50 flex flex-col sm:flex-row items-center sm:items-start gap-4 transition hover:shadow-md';

            const sender = req.sender || {};
            const pic = sender.profile_picture_url || '/images/placeholder-profile.svg';
            const name = sender.full_name || 'Member';
            const age = sender.age ? `${sender.age} Yrs` : '';
            const details = [age, sender.city, sender.education].filter(Boolean).join(' • ');
            const memberRef = sender.member_id || sender.id || req.sender_id;

            card.innerHTML = `
                <img src="${pic}" onerror="this.src='/images/placeholder-profile.svg'" class="w-16 h-16 rounded-full object-cover border-2 border-pink-100 cursor-pointer hover:opacity-90 transition" onclick="viewFullProfile('${memberRef}')" title="Click to view full profile">
                <div class="flex-1 text-center sm:text-left">
                    <h3 class="font-bold text-gray-800 text-lg hover:text-pink-600 cursor-pointer transition inline-block" onclick="viewFullProfile('${memberRef}')" title="Click to view full profile">${name}</h3>
                    <p class="text-sm text-gray-500">${details}</p>
                    <p class="text-xs text-pink-600 mt-1">Requested on ${new Date(req.created_at).toLocaleDateString()}</p>
                </div>
                <div class="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto mt-4 sm:mt-0 justify-center items-center">
                    <button onclick="viewFullProfile('${memberRef}')" class="px-3.5 py-2 bg-pink-50 border border-pink-200 text-pink-600 rounded-lg hover:bg-pink-100 hover:text-pink-700 transition text-sm font-semibold flex items-center justify-center gap-1.5 shadow-sm">
                        <i class="fas fa-id-card"></i> View Profile
                    </button>
                    <button onclick="handleRequest('${req.id}', 'decline')" class="decline-btn flex-1 sm:flex-none px-4 py-2 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition text-sm font-semibold">
                        <i class="fas fa-times mr-1"></i> Decline
                    </button>
                    <button onclick="handleRequest('${req.id}', 'accept')" class="accept-btn flex-1 sm:flex-none px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-sm font-semibold">
                        <i class="fas fa-check mr-1"></i> Accept
                    </button>
                </div>
            `;
            receivedList.appendChild(card);
        });
    }

    function renderSentRequests(requests) {
        sentList.innerHTML = '';
        sentCount.textContent = requests.length;

        if (requests.length === 0) {
            noSent.classList.remove('hidden');
            return;
        }

        noSent.classList.add('hidden');

        requests.forEach(req => {
            const card = document.createElement('div');
            card.className = 'bg-white p-4 rounded-xl shadow-sm border border-pink-50 flex flex-col sm:flex-row items-center sm:items-start gap-4 transition hover:shadow-md';

            const receiver = req.receiver || {};
            const pic = receiver.profile_picture_url || '/images/placeholder-profile.svg';
            const name = receiver.full_name || 'Member';
            const age = receiver.age ? `${receiver.age} Yrs` : '';
            const details = [age, receiver.city, receiver.education].filter(Boolean).join(' • ');
            const memberRef = receiver.member_id || receiver.id || req.receiver_id;

            let badgeHtml = '';
            if (req.status === 'accepted') {
                badgeHtml = `
                    <span class="px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-semibold border border-green-200 uppercase tracking-wide">
                        <i class="fas fa-check-circle mr-1"></i> Connected
                    </span>
                `;
            } else if (req.status === 'declined') {
                badgeHtml = `
                    <span class="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-semibold border border-red-200 uppercase tracking-wide">
                        <i class="fas fa-times-circle mr-1"></i> Declined
                    </span>
                `;
            } else {
                badgeHtml = `
                    <span class="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-semibold border border-gray-200 uppercase tracking-wide">
                        <i class="fas fa-clock mr-1"></i> Pending
                    </span>
                `;
            }

            const isOffline = String(req.receiver_id || '').startsWith('offline_');
            const cancelBtn = (req.status === 'pending' && !isOffline) ? `
                <button onclick="cancelRequest('${req.id}', this)" class="px-4 py-2 bg-red-50 border border-red-200 text-red-500 rounded-lg hover:bg-red-100 transition text-sm font-semibold">
                    <i class="fas fa-times mr-1"></i> Cancel
                </button>
            ` : '';

            card.innerHTML = `
                <img src="${pic}" onerror="this.src='/images/placeholder-profile.svg'" class="w-16 h-16 rounded-full object-cover border-2 border-pink-100 cursor-pointer hover:opacity-90 transition" onclick="viewFullProfile('${memberRef}')" title="Click to view full profile">
                <div class="flex-1 text-center sm:text-left">
                    <h3 class="font-bold text-gray-800 text-lg hover:text-pink-600 cursor-pointer transition inline-block" onclick="viewFullProfile('${memberRef}')" title="Click to view full profile">${name}</h3>
                    <p class="text-sm text-gray-500">${details}</p>
                    <p class="text-xs text-pink-600 mt-1">Sent on ${new Date(req.created_at).toLocaleDateString()}</p>
                </div>
                <div class="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto mt-4 sm:mt-0 justify-center items-center">
                    <button onclick="viewFullProfile('${memberRef}')" class="px-3.5 py-2 bg-pink-50 border border-pink-200 text-pink-600 rounded-lg hover:bg-pink-100 hover:text-pink-700 transition text-sm font-semibold flex items-center justify-center gap-1.5 shadow-sm">
                        <i class="fas fa-id-card"></i> View Profile
                    </button>
                    ${badgeHtml}
                    ${cancelBtn}
                </div>
            `;
            sentList.appendChild(card);
        });
    }

    function renderDeclinedRequests(requests) {
        const declinedList = document.getElementById('declinedInterestsList');
        const declinedCount = document.getElementById('declinedCount');
        const noDeclined = document.getElementById('noDeclinedInterests');

        if (!declinedList || !declinedCount || !noDeclined) return;

        declinedList.innerHTML = '';
        declinedCount.textContent = requests.length;

        if (requests.length === 0) {
            noDeclined.classList.remove('hidden');
            return;
        }

        noDeclined.classList.add('hidden');

        requests.forEach(req => {
            const card = document.createElement('div');
            card.className = 'bg-white p-4 rounded-xl shadow-sm border border-pink-50 flex flex-col sm:flex-row items-center sm:items-start gap-4 opacity-90 transition hover:shadow-md';

            const user = req.other_user || {};
            const pic = user.profile_picture_url || '/images/placeholder-profile.svg';
            const name = user.full_name || 'Member';
            const age = user.age ? `${user.age} Yrs` : '';
            const details = [age, user.city, user.education].filter(Boolean).join(' • ');
            const memberRef = user.member_id || user.id || req.other_user_id;
            const typeLabel = req.type === 'sent' ? 'You Expressed Interest' : 'Expressed Interest in You';
            const statusLabel = req.type === 'sent' ? 'Declined by Member' : 'Declined by You';

            let actionButton = '';
            if (req.type === 'sent') {
                actionButton = `
                    <button onclick="handleResendInterest('${user.id}', this)" class="px-4 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:from-pink-600 hover:to-pink-700 transition text-sm font-semibold shadow">
                        <i class="fas fa-heart mr-1"></i> Interest Again
                    </button>
                `;
            } else {
                actionButton = `
                    <button onclick="handleRequest('${req.id}', 'accept')" class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-sm font-semibold shadow">
                        <i class="fas fa-check mr-1"></i> Accept & Connect
                    </button>
                `;
            }

            card.innerHTML = `
                <img src="${pic}" onerror="this.src='/images/placeholder-profile.svg'" class="w-16 h-16 rounded-full object-cover border-2 border-pink-100 cursor-pointer hover:opacity-90 transition" onclick="viewFullProfile('${memberRef}')" title="Click to view full profile">
                <div class="flex-1 text-center sm:text-left">
                    <div class="flex flex-wrap justify-center sm:justify-start items-center gap-2 mb-1">
                        <h3 class="font-bold text-gray-800 text-lg hover:text-pink-600 cursor-pointer transition inline-block" onclick="viewFullProfile('${memberRef}')" title="Click to view full profile">${name}</h3>
                        <span class="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${req.type === 'sent' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-purple-50 text-purple-600 border border-purple-200'}">${req.type}</span>
                    </div>
                    <p class="text-sm text-gray-500">${details}</p>
                    <p class="text-xs text-red-500 mt-1.5 font-semibold"><i class="fas fa-ban mr-1"></i> ${statusLabel}</p>
                </div>
                <div class="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto mt-4 sm:mt-0 justify-center items-center">
                    <button onclick="viewFullProfile('${memberRef}')" class="px-3.5 py-2 bg-pink-50 border border-pink-200 text-pink-600 rounded-lg hover:bg-pink-100 hover:text-pink-700 transition text-sm font-semibold flex items-center justify-center gap-1.5 shadow-sm">
                        <i class="fas fa-id-card"></i> View Profile
                    </button>
                    ${actionButton}
                </div>
            `;
            declinedList.appendChild(card);
        });
    }

    window.switchTab = function (tabName) {
        const sentTab = document.getElementById('sentTab');
        const receivedTab = document.getElementById('receivedTab');
        const declinedTab = document.getElementById('declinedTab');
        
        const sentContent = document.getElementById('sentInterestsContent');
        const receivedContent = document.getElementById('receivedInterestsContent');
        const declinedContent = document.getElementById('declinedInterestsContent');

        if (!sentTab || !receivedTab || !declinedTab || !sentContent || !receivedContent || !declinedContent) return;

        // Reset all tabs active state
        [sentTab, receivedTab, declinedTab].forEach(tab => {
            tab.classList.remove('active', 'border-pink-600', 'text-pink-600');
            tab.classList.add('border-transparent', 'text-gray-500');
        });

        // Hide all contents
        [sentContent, receivedContent, declinedContent].forEach(content => {
            content.classList.add('hidden');
        });

        // Activate selected tab & content
        if (tabName === 'sent') {
            sentTab.classList.add('active', 'border-pink-600', 'text-pink-600');
            sentTab.classList.remove('border-transparent', 'text-gray-500');
            sentContent.classList.remove('hidden');
        } else if (tabName === 'received') {
            receivedTab.classList.add('active', 'border-pink-600', 'text-pink-600');
            receivedTab.classList.remove('border-transparent', 'text-gray-500');
            receivedContent.classList.remove('hidden');
        } else if (tabName === 'declined') {
            declinedTab.classList.add('active', 'border-pink-600', 'text-pink-600');
            declinedTab.classList.remove('border-transparent', 'text-gray-500');
            declinedContent.classList.remove('hidden');
        }
    }

    function showUpgradePrompt(title, msg) {
        if (window.showUpgradeModal) {
            window.showUpgradeModal(title, msg, 'View Plans');
            return;
        }
        const old = document.getElementById('req-upgrade-dialog');
        if (old) old.remove();

        const html = `
            <div id="req-upgrade-dialog" style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 1000000; display: flex; align-items: center; justify-content: center; padding: 20px;">
                <div style="background: #fff; border-radius: 24px; max-width: 420px; width: 100%; padding: 32px 24px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.35);">
                    <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #f9a8d4, #ec4899); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: #fff; font-size: 24px;">
                        <i class="fas fa-crown"></i>
                    </div>
                    <h3 style="font-size: 20px; font-weight: 800; color: #111827; margin: 0 0 10px 0;">${title || 'Membership Plan Required'}</h3>
                    <p style="font-size: 14px; color: #4b5563; line-height: 1.5; margin: 0 0 24px 0;">${msg || 'An active paid membership plan is required for this action.'}</p>
                    <div style="display: flex; gap: 12px; justify-content: center;">
                        <button onclick="document.getElementById('req-upgrade-dialog').remove()" style="flex: 1; padding: 12px 18px; border-radius: 14px; background: #f3f4f6; color: #4b5563; font-weight: 700; border: none; cursor: pointer;">
                            Maybe Later
                        </button>
                        <a href="membership.html" style="flex: 1.3; padding: 12px 18px; border-radius: 14px; background: linear-gradient(135deg, #ec4899, #db2777); color: #fff; font-weight: 800; text-decoration: none; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(219,39,119,0.3);">
                            View Plans
                        </a>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    }

    function getUserPlan() {
        let currentUser = {};
        try {
            currentUser = JSON.parse(localStorage.getItem('userData') || localStorage.getItem('vm_user') || '{}');
        } catch (e) {}
        return (currentUser.plan_name || 'free').toLowerCase();
    }

    window.handleResendInterest = async function(userId, btn) {
        if (getUserPlan() === 'free') {
            showUpgradePrompt(
                'Membership Plan Required',
                'Sending or re-sending interest requests requires an active membership plan. Please upgrade to connect.'
            );
            return;
        }

        const original = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        btn.disabled = true;
        try {
            const token = localStorage.getItem('vm_token');
            const res = await fetch('/api/requests/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ receiver_id: userId })
            });
            const data = await res.json();
            if (!res.ok) {
                if (data.code === 'UPGRADE_REQUIRED' || res.status === 403) {
                    showUpgradePrompt('Membership Plan Required', data.error || data.message);
                    btn.innerHTML = original;
                    btn.disabled = false;
                    return;
                }
                throw new Error(data.error || 'Failed to send request');
            }
            if (window.showNotification) window.showNotification('Interest request re-sent successfully!', 'success');
            loadRequests();
        } catch (err) {
            btn.innerHTML = original;
            btn.disabled = false;
            if (window.showNotification) window.showNotification(err.message, 'error');
        }
    };

    window.cancelRequest = async function(requestId, btn) {
        if (!confirm('Cancel this interest request?')) return;
        const original = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        btn.disabled = true;
        try {
            const token = localStorage.getItem('vm_token');
            const res = await fetch('/api/requests/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ request_id: requestId })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to cancel');
            if (window.showNotification) window.showNotification('Request cancelled successfully', 'success');
            loadRequests();
        } catch (err) {
            btn.innerHTML = original;
            btn.disabled = false;
            if (window.showNotification) window.showNotification(err.message, 'error');
        }
    };

    window.handleRequest = async function (requestId, action) {
        if (action === 'accept' && getUserPlan() === 'free') {
            showUpgradePrompt(
                'Membership Plan Required',
                'Accepting connection requests requires an active paid membership plan. Upgrade today to start connecting with your matches!'
            );
            return;
        }

        try {
            const token = localStorage.getItem('vm_token');
            const res = await fetch(`/api/requests/${action}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ request_id: requestId })
            });

            const data = await res.json();
            if (!res.ok) {
                if (data.code === 'UPGRADE_REQUIRED' || res.status === 403) {
                    showUpgradePrompt('Membership Plan Required', data.error || 'You need an active plan to complete this action.');
                    return;
                }
                throw new Error(data.error || `Failed to ${action} request`);
            }

            if (window.showNotification) window.showNotification(`Request ${action}ed successfully`, 'success');
            else alert(`Request ${action}ed`);

            loadRequests(); // Reload
        } catch (err) {
            console.error(err);
            if (window.showNotification) window.showNotification(err.message, 'error');
            else alert(err.message);
        }
    };

    window.viewFullProfile = function (memberRef) {
        if (!memberRef) return;
        if (window.fullProfileModal && typeof window.fullProfileModal.open === 'function') {
            window.fullProfileModal.open(memberRef);
        } else {
            window.location.href = `profile.html?id=${encodeURIComponent(memberRef)}`;
        }
    };

    // Default to received tab
    setTimeout(() => { switchTab('received'); }, 100);
    loadRequests();
});

