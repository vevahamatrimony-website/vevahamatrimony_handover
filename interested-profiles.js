/**
 * interested-profiles.js
 * Logic for fetching and displaying profiles the user has expressed interest in.
 */

document.addEventListener('DOMContentLoaded', () => {
    const profilesGrid = document.getElementById('profilesGrid');
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const profileCount = document.getElementById('profileCount');
    
    // Counters
    const totalInterestsEl = document.getElementById('totalInterests');
    const totalResponsesEl = document.getElementById('totalResponses');
    const totalPendingEl = document.getElementById('totalPending');

    let allRequests = [];
    let currentFilter = 'all';

    async function loadInterests() {
        console.log('[DEBUG] Loading interests for interested-profiles...');
        try {
            loadingState.classList.remove('hidden');
            profilesGrid.innerHTML = '';
            emptyState.classList.add('hidden');

            const token = localStorage.getItem('vm_token');
            console.log('[DEBUG] Token present:', !!token);
            if (!token) {
                window.location.href = 'login.html';
                return;
            }

            // --- SESSION DIAGNOSTIC ---
            try {
                const diagRes = await fetch('/api/requests/debug', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const diagData = await diagRes.json();
                console.log('[DEBUG] SESSION DIAGNOSTIC:', diagData);
            } catch (e) {
                console.warn('[DEBUG] Diagnostic fetch failed:', e);
            }

            const res = await fetch('/api/requests/sent', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await res.json();
            console.log('[DEBUG] API Response for /sent:', data);
            if (!res.ok) throw new Error(data.error || 'Failed to load interests');

            allRequests = data.requests || [];
            updateCounters();
            filterInterests(currentFilter);

        } catch (err) {
            console.error('Error loading interests:', err);
            loadingState.classList.add('hidden');
            showNotification(err.message, 'error');
        }
    }

    function updateCounters() {
        if (!allRequests) return;
        
        const total = allRequests.length;
        const accepted = allRequests.filter(r => r.status === 'accepted').length;
        const declined = allRequests.filter(r => r.status === 'declined').length;
        const pending = allRequests.filter(r => r.status === 'pending').length;

        if (totalInterestsEl) totalInterestsEl.textContent = total;
        if (totalResponsesEl) totalResponsesEl.textContent = accepted + declined;
        if (totalPendingEl) totalPendingEl.textContent = pending;
    }

    window.filterInterests = function(status) {
        currentFilter = status;
        
        // Update button UI
        document.querySelectorAll('.filter-btn').forEach(btn => {
            if (btn.dataset.filter === status) {
                btn.classList.add('bg-pink-600', 'text-white');
                btn.classList.remove('bg-white', 'text-gray-700');
            } else {
                btn.classList.remove('bg-pink-600', 'text-white');
                btn.classList.add('bg-white', 'text-gray-700');
            }
        });

        const filtered = status === 'all' 
            ? allRequests 
            : allRequests.filter(r => r.status === status);

        renderInterests(filtered);
    };

    function renderInterests(requests) {
        loadingState.classList.add('hidden');
        profilesGrid.innerHTML = '';

        if (requests.length === 0) {
            emptyState.classList.remove('hidden');
            profileCount.textContent = '0 profiles found';
            return;
        }

        emptyState.classList.add('hidden');
        profileCount.textContent = `${requests.length} profiles found`;

        const planMeta = {
            silver:  { label: 'Silver',  icon: 'fa-medal',  color: 'from-gray-500 to-gray-600' },
            gold:    { label: 'Gold',    icon: 'fa-trophy', color: 'from-yellow-500 to-yellow-600' },
            diamond: { label: 'Diamond', icon: 'fa-gem',    color: 'from-blue-500 to-blue-600' },
            vip:     { label: 'VIP',     icon: 'fa-crown',  color: 'from-purple-500 to-purple-600' },
            free:    { label: '',        icon: '',          color: '' }
        };

        requests.forEach(req => {
            const member = req.receiver;
            if (!member) return;

            const memberId = member.member_id;
            const plan = planMeta[member.plan_name] || planMeta.free;
            const imgSrc = member.profile_picture_url || '/images/placeholder-profile.svg';
            const age = member.age ? `${member.age} Yrs` : '';
            const location = [member.city, member.state].filter(Boolean).join(', ');
            
            const score = member.match_percentage || 0;
            const scoreColor = score >= 80 ? 'text-green-600 bg-green-50 border-green-200' : 
                               (score >= 50 ? 'text-yellow-600 bg-yellow-50 border-yellow-200' : 
                               'text-gray-600 bg-gray-50 border-gray-200');

            const statusLabel = req.status.charAt(0).toUpperCase() + req.status.slice(1);
            const statusColor = req.status === 'accepted' ? 'bg-green-100 text-green-700 border-green-200' :
                                req.status === 'declined' ? 'bg-red-100 text-red-700 border-red-200' :
                                'bg-blue-100 text-blue-700 border-blue-200';

            const card = document.createElement('div');
            card.className = 'profile-card bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all relative';
            
            card.innerHTML = `
                <div class="${statusColor} absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-bold border z-10 uppercase tracking-wider">
                    ${statusLabel}
                </div>
                <div class="absolute top-3 right-3 z-10">
                    <div class="w-8 h-8 rounded-full ${scoreColor} flex items-center justify-center shadow-md text-[10px] font-bold border" title="Match Percentage">
                        ${score}%
                    </div>
                </div>
                <div class="p-5 flex flex-col items-center">
                    <div class="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-50 mb-4 shadow-sm">
                        <img src="${imgSrc}" class="w-full h-full object-cover" onerror="this.src='/images/placeholder-profile.svg'">
                    </div>
                    <h3 class="text-lg font-bold text-gray-900 mb-1 text-center truncate w-full">${member.full_name}</h3>
                    <p class="text-xs text-pink-600 font-medium mb-3">${memberId}</p>
                    
                    <div class="grid grid-cols-2 gap-2 w-full mb-4">
                        <div class="bg-gray-50 rounded-lg p-2 text-center">
                            <p class="text-[10px] text-gray-500 uppercase">Age</p>
                            <p class="text-xs font-bold text-gray-800">${age || 'N/A'}</p>
                        </div>
                        <div class="bg-gray-50 rounded-lg p-2 text-center">
                            <p class="text-[10px] text-gray-500 uppercase">City</p>
                            <p class="text-xs font-bold text-gray-800 truncate px-1">${member.city || 'N/A'}</p>
                        </div>
                    </div>

                    <div class="w-full space-y-2">
                        <button class="view-profile-btn w-full py-2 bg-pink-50 text-pink-600 rounded-xl text-sm font-bold hover:bg-pink-100 transition-colors">
                            View Profile
                        </button>

                    </div>
                </div>
            `;

            // Wire up buttons
            card.querySelector('.view-profile-btn').onclick = () => window.fullProfileModal.open(memberId, { hideActions: true });


            profilesGrid.appendChild(card);
        });
    }

    // Legacy modal logic removed - replaced by FullProfileModal

    function showNotification(message, type = 'info') {
        if (window.showNotification) {
            window.showNotification(message, type);
            return;
        }
        alert(message);
    }

    loadInterests();
});
