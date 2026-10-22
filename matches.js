// matches.js
// Handles fetching matching opposite-gender profiles and rendering them

document.addEventListener('DOMContentLoaded', () => {
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const profilesContainer = document.getElementById('profilesContainer');
    const profilesGrid = document.getElementById('profilesGrid');
    const profileCount = document.getElementById('profileCount');
    const refreshBtn = document.getElementById('refreshBtn');

    // Filter & Tab Elements
    const matchesFilterSection = document.getElementById('matchesFilterSection');
    const tabRecommended = document.getElementById('tabRecommended');
    const tabPreferred = document.getElementById('tabPreferred');
    const tabAll = document.getElementById('tabAll');
    const filterToggleBtn = document.getElementById('filterToggleBtn');
    const filterPanel = document.getElementById('filterPanel');
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');

    // Filter Inputs
    const filterMemberId = document.getElementById('filterMemberId');
    const filterAgeFrom = document.getElementById('filterAgeFrom');
    const filterAgeTo = document.getElementById('filterAgeTo');
    const filterMaritalStatus = document.getElementById('filterMaritalStatus');
    const filterReligion = document.getElementById('filterReligion');
    const filterCaste = document.getElementById('filterCaste');
    const filterStar = document.getElementById('filterStar');
    const filterRasi = document.getElementById('filterRasi');
    const filterLagnam = document.getElementById('filterLagnam');
    const filterEducation = document.getElementById('filterEducation');
    const filterOccupation = document.getElementById('filterOccupation');
    const filterIncome = document.getElementById('filterIncome');
    const filterCountry = document.getElementById('filterCountry');
    const filterState = document.getElementById('filterState');
    const filterCity = document.getElementById('filterCity');
    const filterVipOnly = document.getElementById('filterVipOnly');
    const filterPremiumOnly = document.getElementById('filterPremiumOnly');

    // State
    let currentView = 'recommended'; // 'recommended', 'preferred' or 'all'
    let activeFilters = {};

    // Check if VM exists (from global-settings.js/api-client.js)
    if (!window.VMAuth || !VMAuth.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }

    // Show filter section if logged in
    if (matchesFilterSection) matchesFilterSection.classList.remove('hidden');

    async function loadMatches() {
        // Show loading state
        loadingState.classList.remove('hidden');
        profilesContainer.classList.add('hidden');
        emptyState.classList.add('hidden');

        try {
            const token = localStorage.getItem('vm_token');
            
            // Build URL based on currentView and Filters
            let url = '/api/matches';
            if (currentView === 'recommended') {
                url = '/api/matches/recommended';
            } else if (currentView === 'preferred') {
                url = '/api/matches/preferred';
            } else if (currentView === 'all') {
                const params = new URLSearchParams(activeFilters);
                if (params.toString()) url += `?${params.toString()}`;
            }

            const res = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await res.json();

            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    localStorage.removeItem('vm_token');
                    localStorage.removeItem('userSession');
                    window.location.href = 'login.html?expired=true';
                    return;
                }
                throw new Error(data.error || 'Failed to fetch matches');
            }

            loadingState.classList.add('hidden');

            if (!data.profiles || data.profiles.length === 0) {
                emptyState.classList.remove('hidden');
                
                const titleEl = emptyState.querySelector('h3');
                const descEl = emptyState.querySelector('p');
                const listEl = emptyState.querySelector('.space-y-2');
                
                if (currentView === 'preferred' && data.has_preferences === false) {
                    if (titleEl) titleEl.textContent = 'Preferred: No Preferences Selected';
                    if (descEl) descEl.textContent = 'You have not configured any Partner Preferences during registration or in your profile.';
                    if (listEl) {
                        listEl.innerHTML = `
                            <p>To view matching profiles here, please set your partner preferences in Edit Profile.</p>
                            <div class="mt-4 flex flex-col sm:flex-row gap-4 justify-center">
                                <button onclick="document.getElementById('tabAll').click()" class="inline-block bg-gray-200 text-gray-700 px-6 py-2.5 rounded-xl font-bold hover:bg-gray-300 transition duration-300">Explore All & Advanced Search</button>
                            </div>
                        `;
                    }
                } else {
                    if (titleEl) titleEl.textContent = 'No Matches Found';
                    if (descEl) descEl.textContent = 'We couldn\'t find any profiles matching your criteria at the moment.';
                    if (listEl) {
                        listEl.innerHTML = `
                            <p> Try refreshing the page</p>
                            <p> Check back later for new profiles</p>
                            <p> Consider upgrading your membership for more options</p>
                        `;
                    }
                }
                return;
            }

            renderProfiles(data.profiles);
            profileCount.textContent = `${data.total || data.profiles.length} profiles found`;
            profilesContainer.classList.remove('hidden');

        } catch (error) {
            console.error('Error fetching matches:', error);
            loadingState.classList.add('hidden');
            emptyState.classList.remove('hidden');
            emptyState.querySelector('h3').textContent = 'Error Loading Matches';
            emptyState.querySelector('p').textContent = error.message;
        }
    }

    function renderProfiles(profiles) {
        profilesGrid.innerHTML = '';

        const planMeta = {
            silver:  { label: 'Silver',  icon: 'fa-medal',  color: 'from-gray-500 to-gray-600' },
            gold:    { label: 'Gold',    icon: 'fa-trophy', color: 'from-yellow-500 to-yellow-600' },
            diamond: { label: 'Diamond', icon: 'fa-gem',    color: 'from-blue-500 to-blue-600' },
            vip:     { label: 'VIP',     icon: 'fa-crown',  color: 'from-purple-500 to-purple-600' },
            free:    { label: '',        icon: '',          color: '' }
        };

        // Show all profiles to all plans (slicing limit removed)
        let displayProfiles = profiles;

        displayProfiles.forEach(member => {
            const memberId = member.member_id || member.id;
            const plan = planMeta[member.plan_name] || planMeta.free;
            const imgSrc = member.profile_picture_url || '/images/placeholder-profile.svg';
            const placeholder = '/images/placeholder-profile.svg';

            const currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
            const isSelf = member.id === currentUser.id;
            const isPhotoLocked = !isSelf && (
                member.hide_photo === true || 
                member.hide_photo === 'true' || 
                member.profile_photo_locked === true || 
                member.profile_photo_locked === 'true'
            );

            const age = member.age ? `${member.age} Yrs` : '';
            const caste = member.caste || '';
            const edu = member.education || '';
            const job = member.job_roles || '';
            const location = [member.city, member.state].filter(Boolean).join(', ');
            const detailsText = [age, caste, edu, job, location].filter(Boolean).join(', ') || 'Details hidden';

            const score = member.match_percentage || 0;
            const scoreColor = score >= 80 ? 'text-green-600 bg-green-50 border-green-200' : 
                               (score >= 50 ? 'text-yellow-600 bg-yellow-50 border-yellow-200' : 
                               'text-gray-600 bg-gray-50 border-gray-200');

            const scoreCircle = `<div class="w-8 h-8 rounded-full ${scoreColor} flex items-center justify-center shadow-md text-[10px] font-bold border" title="Match Percentage">${score}%</div>`;

            const badgeHtml = plan.label
                ? `<div class="absolute -top-2 -left-2 bg-gradient-to-r ${plan.color} text-white px-3 py-1 rounded-full text-xs font-semibold shadow-md z-20 flex items-center gap-1"><i class="fas ${plan.icon}"></i> ${plan.label} Member</div>` : '';

            const card = document.createElement('div');
            card.className = 'member-card bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-visible relative';
            card.style.cssText = 'background:#fdfdfc;border-radius:15px;';
            card.dataset.memberId = memberId;

            card.innerHTML = `
                ${badgeHtml}
                <div class="absolute top-3 right-3 flex flex-col gap-2 z-10">
                    <div class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shadow-md" title="Verified Profile"><i class="fas fa-check text-white text-sm"></i></div>
                    <button class="shortlist-btn w-8 h-8 rounded-full bg-pink-400 flex items-center justify-center shadow-md hover:bg-pink-600 transition-colors" title="Add to shortlist"><i class="fas fa-bookmark text-white text-sm"></i></button>
                    ${scoreCircle}
                </div>
                <div class="flex justify-center pt-6 pb-3">
                    <div class="relative">
                        <div class="w-40 h-40 rounded-full overflow-hidden border-4 border-gray-200 bg-gray-100 shadow">
                            <img src="${imgSrc}" alt="${member.full_name || 'Member'}" class="w-full h-full object-cover" style="${isPhotoLocked ? 'filter: blur(12px) grayscale(50%); pointer-events: none; -webkit-user-drag: none;' : ''}" onerror="this.onerror=null;this.src='${placeholder}'">
                        </div>
                        ${isPhotoLocked ? `
                        <div class="absolute bottom-1 right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center border-2 border-gray-300 shadow"><i class="fas fa-lock text-gray-600 text-xs"></i></div>
                        ` : ''}
                    </div>
                </div>
                <div class="px-4 pb-4">
                    <div class="flex items-center justify-between mb-1">
                        <h3 class="text-xl font-bold text-gray-900 flex-1 truncate">${member.full_name || 'Member'}</h3>
                        <div class="flex gap-2 ml-2">
                            <button class="whatsapp-btn w-9 h-9 rounded-full bg-green-500 flex items-center justify-center shadow hover:bg-green-600 transition-colors" title="WhatsApp"><i class="fab fa-whatsapp text-white text-base"></i></button>
                            <button class="call-btn w-9 h-9 rounded-full bg-red-500 flex items-center justify-center shadow hover:bg-red-600 transition-colors" title="Call"><i class="fas fa-phone text-white text-base"></i></button>
                        </div>
                    </div>
                    <p class="text-pink-500 font-semibold text-sm mb-2">${memberId}</p>
                    <p class="text-gray-700 text-sm leading-relaxed mb-3 min-h-[40px]">${detailsText}</p>
                    <div class="text-right mb-3">
                        <span class="text-cyan-500 font-semibold text-sm cursor-pointer hover:text-cyan-600 transition-colors view-more-btn">VIEW MORE</span>
                    </div>
                    <div class="flex gap-3">
                        <button class="decline-btn flex-1 py-2.5 rounded-full border-2 border-red-500 text-red-500 font-semibold hover:bg-red-50 transition-all duration-200 flex items-center justify-center gap-2" style="border-radius:25px;">
                            <span style="font-size:18px">😞</span><span>Decline</span>
                        </button>
                        <button class="interest-btn flex-1 py-2.5 rounded-full border-2 border-green-500 text-green-500 font-semibold hover:bg-green-50 transition-all duration-200 flex items-center justify-center gap-2" style="border-radius:25px;">
                            <span style="font-size:18px">💖</span><span>Interest</span>
                        </button>
                    </div>
                </div>`;

            // Wire up buttons
            const targetUuid = member.id || member.member_id;
            console.log(`[DEBUG] Profile ${member.member_id}: Using ID ${targetUuid} (id field: ${member.id})`);

            card.querySelector('.decline-btn').onclick = () => sendInterestRequest(targetUuid, card.querySelector('.decline-btn'), 'declined').then(() => card.remove());
            card.querySelector('.interest-btn').onclick = () => sendInterestRequest(targetUuid, card.querySelector('.interest-btn'));
            card.querySelector('.view-more-btn').onclick = () => openProfileModal(member);
            card.querySelector('.whatsapp-btn').onclick = () => openProfileModal(member);
            card.querySelector('.call-btn').onclick = () => openProfileModal(member);

            profilesGrid.appendChild(card);
        });
    }

    // Modal handling
    function openProfileModal(member) {
        if (window.fullProfileModal) {
            window.fullProfileModal.open(member.member_id);
        } else {
            console.error('FullProfileModal not loaded');
            alert('Profile details are still loading. Please try again in a moment.');
        }
    }

    function closeProfileModal() {
        const modal = document.getElementById('profileModal');
        if (modal) modal.classList.add('hidden');
    }

    // expose to global for onclick in HTML if needed
    window.closeProfileModal = closeProfileModal;

    // --- Filter & Tab Logic ---

    function switchTab(view) {
        if (currentView === view) return;
        currentView = view;

        // UI Updates
        tabRecommended.classList.remove('tab-active');
        tabRecommended.classList.add('text-gray-500');
        if (tabPreferred) {
            tabPreferred.classList.remove('tab-active');
            tabPreferred.classList.add('text-gray-500');
        }
        tabAll.classList.remove('tab-active');
        tabAll.classList.add('text-gray-500');

        if (view === 'recommended') {
            tabRecommended.classList.add('tab-active');
            tabRecommended.classList.remove('text-gray-500');
            filterToggleBtn.classList.add('hidden'); // Hide filters for recommended
            filterPanel.classList.add('hidden');
        } else if (view === 'preferred') {
            if (tabPreferred) {
                tabPreferred.classList.add('tab-active');
                tabPreferred.classList.remove('text-gray-500');
            }
            filterToggleBtn.classList.add('hidden'); // Hide filters for preferred
            filterPanel.classList.add('hidden');
        } else {
            tabAll.classList.add('tab-active');
            tabAll.classList.remove('text-gray-500');
            filterToggleBtn.classList.remove('hidden');
        }

        loadMatches();
    }

    function toggleFilterPanel() {
        filterPanel.classList.toggle('hidden');
    }

    function applyFilters() {
        activeFilters = {};
        if (filterMemberId && filterMemberId.value) activeFilters.member_id = filterMemberId.value;
        if (filterAgeFrom && filterAgeFrom.value) activeFilters.age_from = filterAgeFrom.value;
        if (filterAgeTo && filterAgeTo.value) activeFilters.age_to = filterAgeTo.value;
        if (filterMaritalStatus && filterMaritalStatus.value) activeFilters.marital_status = filterMaritalStatus.value;
        if (filterReligion && filterReligion.value) activeFilters.religion = filterReligion.value;
        if (filterCaste && filterCaste.value) activeFilters.caste = filterCaste.value;
        if (filterStar && filterStar.value) activeFilters.star = filterStar.value;
        if (filterRasi && filterRasi.value) activeFilters.rasi = filterRasi.value;
        if (filterLagnam && filterLagnam.value) activeFilters.lagnam = filterLagnam.value;
        if (filterEducation && filterEducation.value) activeFilters.education = filterEducation.value;
        if (filterOccupation && filterOccupation.value) activeFilters.occupation = filterOccupation.value;
        if (filterIncome && filterIncome.value) activeFilters.income = filterIncome.value;
        if (filterCountry && filterCountry.value) activeFilters.country = filterCountry.value;
        if (filterState && filterState.value) activeFilters.state = filterState.value;
        if (filterCity && filterCity.value) activeFilters.city = filterCity.value;

        if (filterVipOnly && filterVipOnly.checked) activeFilters.vip_only = 'true';
        if (filterPremiumOnly && filterPremiumOnly.checked) activeFilters.premium_only = 'true';

        filterPanel.classList.add('hidden');
        loadMatches();
    }

    function clearFilters() {
        if (filterMemberId) filterMemberId.value = '';
        if (filterAgeFrom) filterAgeFrom.value = '';
        if (filterAgeTo) filterAgeTo.value = '';
        if (filterMaritalStatus) filterMaritalStatus.value = '';
        if (filterReligion) filterReligion.value = '';
        if (filterCaste) filterCaste.value = '';
        if (filterStar) filterStar.value = '';
        if (filterRasi) filterRasi.value = '';
        if (filterLagnam) filterLagnam.value = '';
        if (filterEducation) filterEducation.value = '';
        if (filterOccupation) filterOccupation.value = '';
        if (filterIncome) filterIncome.value = '';
        if (filterCountry) filterCountry.value = '';
        if (filterState) filterState.value = '';
        if (filterCity) filterCity.value = '';

        if (filterVipOnly) filterVipOnly.checked = false;
        if (filterPremiumOnly) filterPremiumOnly.checked = false;

        activeFilters = {};
        loadMatches();
    }

    // Event Listeners
    if (tabRecommended) tabRecommended.addEventListener('click', () => switchTab('recommended'));
    if (tabPreferred) tabPreferred.addEventListener('click', () => switchTab('preferred'));
    if (tabAll) tabAll.addEventListener('click', () => switchTab('all'));
    if (filterToggleBtn) filterToggleBtn.addEventListener('click', toggleFilterPanel);
    if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', applyFilters);
    if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', clearFilters);


    async function sendInterestRequest(receiverId, btn, status = 'pending') {
        // Prepare UI for sending
        const oldText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        btn.disabled = true;

        try {
            const payload = { receiver_id: receiverId, status: status };
            console.log('SENDING INTEREST REQUEST TO:', '/api/requests/send');
            console.log('PAYLOAD:', payload);

            const token = localStorage.getItem('vm_token');
            const res = await fetch('/api/requests/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            console.log('RESPONSE STATUS:', res.status);
            const data = await res.json();
            console.log('RESPONSE DATA:', data);

            if (!res.ok) {
                throw new Error(data.details || data.error || 'Failed to process request');
            }

            if (status === 'declined') {
                if (window.showNotification) window.showNotification('Profile declined and hidden', 'info');
                return; // Early return for decline
            }

            // --- INSTANT CONNECTION HANDLING ---
            if (data.request && data.request.status === 'accepted') {
                btn.innerHTML = '<i class="fas fa-handshake"></i> Connected';
                btn.classList.add('bg-pink-100', 'text-pink-700', 'border-pink-200');
                if (window.showNotification) window.showNotification('Instant connection established! Check Connections page.', 'success');
                VM.toast('You are now connected! Opening Connections...', 'success');
                setTimeout(() => window.location.href = 'connections.html', 1500);
                return;
            }

            btn.innerHTML = '<i class="fas fa-check"></i> Sent';
            btn.classList.replace('border-green-500', 'border-gray-300');
            btn.classList.replace('text-green-600', 'text-gray-500');

            // show custom notification
            if (window.showNotification) window.showNotification('Interest request placed successfully', 'success');
            else alert('Interest request sent!');

        } catch (error) {
            console.error('Error sending request:', error);
            btn.innerHTML = oldText;
            btn.disabled = false;

            if (window.showNotification) window.showNotification(error.message, 'error');
            else alert(error.message);
        }
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadMatches);
    }

    // Load initially
    loadMatches();
});
