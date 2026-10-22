/**
 * Active Members Dashboard Logic
 */

let allMembers = [];
let currentTab = 'explore';
let dbSentRequests = [];

document.addEventListener('DOMContentLoaded', () => {
    initActiveMembers();
    initFilterPanelToggle();
});

// Helper to get local storage key scoped to current user
function getStorageKey(type) {
    let userId = 'guest';
    const token = localStorage.getItem('vm_token');
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload && payload.id) userId = payload.id;
        } catch (e) {
            console.error('Error parsing token:', e);
        }
    }
    return `offline_${type}_${userId}`;
}

function getStoredList(type) {
    return JSON.parse(localStorage.getItem(getStorageKey(type)) || '[]');
}

function setStoredList(type, list) {
    localStorage.setItem(getStorageKey(type), JSON.stringify(list));
}

function initFilterPanelToggle() {
    const toggleBtn = document.getElementById('filterToggleBtn');
    const filterPanel = document.getElementById('filterPanel');
    const clearBtn = document.getElementById('clearFiltersBtn');
    const applyBtn = document.getElementById('applyFiltersBtn');

    if (toggleBtn && filterPanel) {
        toggleBtn.addEventListener('click', () => {
            filterPanel.classList.toggle('hidden');
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            clearFilters();
        });
    }

    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            renderTab(currentTab);
        });
    }
}

function clearFilters() {
    const fields = [
        'filterMemberId', 'filterAgeFrom', 'filterAgeTo',
        'filterMaritalStatus', 'filterReligion', 'filterCaste',
        'filterStar', 'filterRasi', 'filterLagnam',
        'filterEducation', 'filterOccupation', 'filterIncome',
        'filterState', 'filterCity'
    ];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    renderTab(currentTab);
}

async function initActiveMembers() {
    const loading = document.getElementById('loadingState');
    try {
        if (!VMAuth.isLoggedIn()) {
            window.location.href = '/login.html?redirect=active-members-dash.html';
            return;
        }

        const token = localStorage.getItem('vm_token');
        const headers = { 'Authorization': `Bearer ${token}` };

        const [matchesRes, uploadedRes, sentRes] = await Promise.all([
            fetch('/api/matches', { headers }).then(r => r.json()).catch(() => ({ profiles: [] })),
            VM.profile.browseUploaded().catch(() => ({ profiles: [] })),
            fetch('/api/requests/sent', { headers }).then(r => r.json()).catch(() => ({ requests: [] }))
        ]);

        const registeredMatches = matchesRes.profiles || [];
        const uploadedProfiles = uploadedRes.profiles || [];
        dbSentRequests = sentRes.requests || [];

        // Clean & sync localStorage with dbSentRequests to prevent stale ghost profiles from desyncing UI
        const activeInterestedIds = dbSentRequests
            .filter(r => r.status !== 'declined')
            .flatMap(r => [String(r.receiver_id), String(r.receiver_id).replace(/^offline_/, '')]);
        const activeDeclinedIds = dbSentRequests
            .filter(r => r.status === 'declined')
            .flatMap(r => [String(r.receiver_id), String(r.receiver_id).replace(/^offline_/, '')]);
        
        setStoredList('interested', [...new Set(activeInterestedIds)]);
        setStoredList('declined', [...new Set(activeDeclinedIds)]);

        // Combine registered matches and uploaded profiles into a unified list, avoiding duplicate IDs
        const combinedMap = new Map();
        registeredMatches.forEach(p => {
            if (p) combinedMap.set(p.member_id || p.id, p);
        });
        uploadedProfiles.forEach(p => {
            if (p) {
                const key = p.member_id || p.id;
                if (!combinedMap.has(key)) {
                    combinedMap.set(key, p);
                }
            }
        });

        allMembers = Array.from(combinedMap.values());

        if (loading) loading.classList.add('hidden');
        renderTab(currentTab);

    } catch (err) {
        console.error('Failed to load members:', err);
        if (loading) {
            loading.innerHTML = `
                <div class="text-center text-red-500 p-8 glass-card rounded-3xl">
                    <i class="fas fa-exclamation-circle text-4xl mb-4"></i>
                    <p class="font-bold">Unable to load profiles</p>
                    <p class="text-sm opacity-70">${err.message}</p>
                </div>
            `;
        }
    }
}

window.switchTab = function(tab) {
    currentTab = tab;
    
    // Update tab classes
    const tabs = ['explore', 'interested', 'declined'];
    tabs.forEach(t => {
        const btn = document.getElementById(`tab-${t}`);
        if (btn) {
            if (t === tab) {
                btn.className = "flex-1 md:px-8 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 text-pink-600 bg-white shadow-sm";
            } else {
                btn.className = "flex-1 md:px-8 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 text-gray-500 hover:text-pink-600";
            }
        }
    });

    renderTab(currentTab);
};

function getProfileIds(m) {
    const ids = [];
    if (m.id) ids.push(String(m.id));
    if (m.member_id) ids.push(String(m.member_id));
    if (m.user_id) ids.push(String(m.user_id));
    return ids;
}

function isProfileInterested(m) {
    const pIds = getProfileIds(m);
    const dbInterested = dbSentRequests
        .filter(r => r.status !== 'declined')
        .flatMap(r => [String(r.receiver_id), String(r.receiver_id).replace(/^offline_/, '')]);

    return pIds.some(id => dbInterested.includes(id));
}

function isProfileDeclined(m) {
    const pIds = getProfileIds(m);
    const dbDeclined = dbSentRequests
        .filter(r => r.status === 'declined')
        .flatMap(r => [String(r.receiver_id), String(r.receiver_id).replace(/^offline_/, '')]);

    return pIds.some(id => dbDeclined.includes(id));
}

function isProfileExplore(m) {
    return !isProfileInterested(m) && !isProfileDeclined(m);
}

// Helper to normalize strings for robust comparison (strips dots, punctuation, hyphens, extra spaces)
function normalizeText(str) {
    if (!str) return '';
    return str.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Smart Education Matching Function
function matchEducation(memberEduRaw, filterValRaw) {
    if (!filterValRaw || filterValRaw.trim() === '') return true;
    if (!memberEduRaw || memberEduRaw.trim() === '') return false;

    const filterRaw = filterValRaw.trim().toLowerCase();
    const eduRaw = memberEduRaw.trim().toLowerCase();

    const cleanEdu = eduRaw.replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
    const cleanFilter = filterRaw.replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
    const normEdu = cleanEdu.replace(/\s+/g, '');
    const normFilter = cleanFilter.replace(/\s+/g, '');

    if (!normEdu) return false;

    // 1. Direct normalized substring check
    if (normEdu.includes(normFilter)) {
        return true;
    }

    const eduWords = cleanEdu.split(' ');

    // --- High School / Intermediate / 10th / 12th ---
    if (filterRaw.includes('high school') || filterRaw.includes('intermediate') || filterRaw.includes('12th') || filterRaw.includes('10th') || normFilter.includes('highschool')) {
        const higherKeywords = ['mca', 'msc', 'mba', 'btech', 'mtech', 'phd', 'doctorate', 'bachelor', 'master', 'bsc', 'bcom', 'bca', 'diploma', 'polytechnic'];
        if (higherKeywords.some(k => normEdu.includes(k))) return false;
        if (eduWords.includes('be') || eduWords.includes('me') || eduWords.includes('degree')) return false;

        return normEdu.includes('highschool') || normEdu.includes('intermediate') || normEdu.includes('12th') || normEdu.includes('10th') || normEdu.includes('sslc') || normEdu.includes('hsc') || normEdu.includes('school');
    }

    // --- Engineering / B.E / B.Tech ---
    if (filterRaw.includes('b.e') || filterRaw.includes('btech') || filterRaw.includes('b.tech') || filterRaw.includes('engineering') || normFilter === 'be' || normFilter === 'btech') {
        if (normEdu.includes('mtech') || normEdu.includes('masteroftech') || normEdu.includes('masterofeng')) return false;
        if (normEdu.includes('msc') || normEdu.includes('mca') || normEdu.includes('mba')) return false;

        return normEdu.includes('btech') || normEdu.includes('engineering') || normEdu.includes('be') || normEdu.includes('bachelorofeng') || normEdu.includes('bacheloroftech');
    }

    // --- Master's / M.E / M.Tech / MCA / MBA / Post Graduate ---
    if (filterRaw.includes('m.e') || filterRaw.includes('mtech') || filterRaw.includes('m.tech') || filterRaw.includes('master') || filterRaw.includes('post') || normFilter === 'me' || normFilter === 'mtech') {
        if (normEdu.includes('btech') && !normEdu.includes('mtech')) return false;
        return normEdu.includes('mtech') || normEdu.includes('master') || normEdu.includes('postgraduate') || normEdu.includes('pg') || normEdu.includes('mca') || normEdu.includes('mba') || normEdu.includes('msc') || normEdu.includes('mcom') || eduWords.includes('me') || normEdu.startsWith('me');
    }

    // --- Diploma / ITI ---
    if (filterRaw.includes('diploma') || filterRaw.includes('iti') || normFilter.includes('diploma')) {
        return normEdu.includes('diploma') || eduWords.includes('iti') || normEdu.includes('polytechnic');
    }

    // --- Doctorate / PhD ---
    if (filterRaw.includes('doctorate') || filterRaw.includes('phd') || filterRaw.includes('ph.d') || normFilter.includes('phd')) {
        return normEdu.includes('phd') || normEdu.includes('doctorate') || normEdu.includes('doctor');
    }

    // --- MCA / MBA / Specific degrees ---
    if (filterRaw.includes('mca') || normFilter === 'mca') {
        return normEdu.includes('mca');
    }
    if (filterRaw.includes('mba') || normFilter === 'mba') {
        return normEdu.includes('mba');
    }
    if (filterRaw.includes('b.sc') || filterRaw.includes('bsc') || normFilter === 'bsc') {
        return normEdu.includes('bsc') && !normEdu.includes('msc');
    }
    if (filterRaw.includes('m.sc') || filterRaw.includes('msc') || normFilter === 'msc') {
        return normEdu.includes('msc');
    }

    // Fallback: Split filter into significant words (min length 3) and check if ALL significant words exist in candidate degree
    const tokens = filterRaw.split(/[\s\/,-]+/).filter(t => t.length >= 3 && t !== 'and' && t !== 'the' && t !== 'for');
    if (tokens.length > 0) {
        return tokens.every(token => normEdu.includes(token.replace(/[^a-z0-9]/g, '')));
    }

    return false;
}

function renderTab(tab) {
    const container = document.getElementById('membersContainer');
    const empty = document.getElementById('emptyState');
    const countEl = document.getElementById('profileCount');

    if (!container) return;
    container.innerHTML = '';
    
    if (empty) empty.classList.add('hidden');

    let filtered = [];
    if (tab === 'explore') {
        filtered = allMembers.filter(isProfileExplore);
    } else if (tab === 'interested') {
        filtered = allMembers.filter(isProfileInterested);
    } else if (tab === 'declined') {
        filtered = allMembers.filter(isProfileDeclined);
    }

    // Apply active Refine Search panel criteria across all 13 fields
    const memberIdVal = document.getElementById('filterMemberId')?.value.trim();
    const ageFromVal = document.getElementById('filterAgeFrom')?.value;
    const ageToVal = document.getElementById('filterAgeTo')?.value;
    const maritalStatusVal = document.getElementById('filterMaritalStatus')?.value.trim();
    const religionVal = document.getElementById('filterReligion')?.value.trim();
    const casteVal = document.getElementById('filterCaste')?.value.trim();
    const starVal = document.getElementById('filterStar')?.value.trim();
    const rasiVal = document.getElementById('filterRasi')?.value.trim();
    const lagnamVal = document.getElementById('filterLagnam')?.value.trim();
    const educationVal = document.getElementById('filterEducation')?.value.trim();
    const occupationVal = document.getElementById('filterOccupation')?.value.trim();
    const incomeVal = document.getElementById('filterIncome')?.value.trim();
    const stateVal = document.getElementById('filterState')?.value.trim();
    const cityVal = document.getElementById('filterCity')?.value.trim();

    filtered = filtered.filter(m => {
        if (memberIdVal && !normalizeText(m.member_id).includes(normalizeText(memberIdVal))) return false;
        
        if (ageFromVal || ageToVal) {
            const dob = m.dob || m.date_of_birth;
            const age = m.age || (dob ? Math.floor((Date.now() - new Date(dob)) / 31557600000) : null);
            if (age !== null) {
                if (ageFromVal && age < parseInt(ageFromVal)) return false;
                if (ageToVal && age > parseInt(ageToVal)) return false;
            }
        }

        if (maritalStatusVal) {
            const mStatus = normalizeText(m.marital_status || m.maritalStatus || '');
            if (!mStatus.includes(normalizeText(maritalStatusVal))) return false;
        }

        if (religionVal) {
            const rel = normalizeText(m.religion || '');
            if (!rel.includes(normalizeText(religionVal))) return false;
        }

        if (casteVal && !normalizeText(m.caste || m.community).includes(normalizeText(casteVal))) return false;
        if (starVal && !normalizeText(m.star || m.nakshatra).includes(normalizeText(starVal))) return false;
        if (rasiVal && !normalizeText(m.rasi).includes(normalizeText(rasiVal))) return false;
        if (lagnamVal && !normalizeText(m.lagnam).includes(normalizeText(lagnamVal))) return false;
        
        if (educationVal && !matchEducation(m.education, educationVal)) return false;
        if (occupationVal && !normalizeText(m.job_roles || m.occupation || m.profession).includes(normalizeText(occupationVal))) return false;
        if (incomeVal && !normalizeText(m.annual_income || m.income).includes(normalizeText(incomeVal))) return false;
        
        if (stateVal || cityVal) {
            const cityAndPlace = normalizeText(m.city || m.birth_place || m.native_place || '');
            const stateAndAddr = normalizeText(m.state || m.address || '');
            if (stateVal && !stateAndAddr.includes(normalizeText(stateVal))) return false;
            if (cityVal && !cityAndPlace.includes(normalizeText(cityVal))) return false;
        }

        return true;
    });

    if (countEl) countEl.textContent = filtered.length;

    if (filtered.length === 0) {
        if (empty) {
            empty.classList.remove('hidden');
            const emptyTitle = empty.querySelector('h3');
            const emptyText = empty.querySelector('p');
            if (tab === 'explore') {
                if (emptyTitle) emptyTitle.textContent = 'No Profiles Found';
                if (emptyText) emptyText.textContent = "We couldn't find any curated profiles matching your preference or filters at the moment.";
            } else if (tab === 'interested') {
                if (emptyTitle) emptyTitle.textContent = 'No Interested Profiles';
                if (emptyText) emptyText.textContent = "Profiles you mark as 'Interest' matching your filters will appear here.";
            } else if (tab === 'declined') {
                if (emptyTitle) emptyTitle.textContent = 'No Declined Profiles';
                if (emptyText) emptyText.textContent = "Profiles you mark as 'Decline' matching your filters will appear here.";
            }
        }
        return;
    }

    // Show all profiles to all plans (slicing limit removed)
    let displayMembers = filtered;

    displayMembers.forEach(member => {
        const card = buildMemberCard(member, tab);
        container.appendChild(card);
    });
}

function buildMemberCard(member, tab) {
    const planMeta = {
        silver:  { label: 'Silver',  icon: 'fa-medal',  color: 'from-gray-500 to-gray-600' },
        gold:    { label: 'Gold',    icon: 'fa-trophy', color: 'from-yellow-500 to-yellow-600' },
        diamond: { label: 'Diamond', icon: 'fa-gem',    color: 'from-blue-500 to-blue-600' },
        vip:     { label: 'VIP',     icon: 'fa-crown',  color: 'from-purple-500 to-purple-600' },
        free:    { label: '',        icon: '',          color: '' }
    };
    const memberId = member.member_id || member.id;
    const plan = planMeta[member.plan_name?.toLowerCase()] || planMeta.free;
    const imgSrc = member.profile_picture_url || '/images/placeholder-profile.svg';
    const placeholder = '/images/placeholder-profile.svg';
    
    const dob = member.dob || member.date_of_birth;
    const ageValue = member.age || (dob ? Math.floor((Date.now() - new Date(dob)) / 31557600000) : '');
    const age = ageValue ? `${ageValue} Yrs` : '';
    
    const details = [
        age,
        member.caste,
        member.education,
        member.job || member.job_roles,
    ].filter(Boolean).join(', ') || 'Details hidden';
    
    const genderLabel = member.gender ? `<span class="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px] font-bold uppercase">${member.gender}</span>` : '';

    const scoreHtml = `<div class="w-8 h-8 rounded-full text-green-600 bg-green-50 border-green-200 flex items-center justify-center shadow-md text-[10px] font-bold border" title="Match Score">95%</div>`;

    const card = document.createElement('div');
    card.className = 'member-card bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-visible relative animate-in';
    card.style.cssText = 'background:#fdfdfc;border-radius:15px;';

    // WhatsApp and Call Actions configuration depending on tab
    let whatsappAction = `openProfileView('${memberId}')`;
    let callAction = `openProfileView('${memberId}')`;
    let isLocked = true;

    if (tab === 'interested') {
        const rawWhatsapp = member.whatsapp || member.mobile_number || '';
        const rawPhone = member.phone || member.mobile_number || '';

        const getPrimary = (str) => {
            if (!str) return '';
            const parts = str.split(',');
            for (let p of parts) {
                const c = p.replace(/[^0-9]/g, '');
                if (c.length >= 10) return c;
            }
            return (str || '').replace(/[^0-9]/g, '');
        };

        const cleanWhatsapp = getPrimary(rawWhatsapp);
        const cleanPhone = getPrimary(rawPhone);
        
        if (cleanWhatsapp) {
            whatsappAction = `window.open('https://wa.me/${cleanWhatsapp}', '_blank')`;
        } else if (cleanPhone) {
            whatsappAction = `window.open('https://wa.me/${cleanPhone}', '_blank')`;
        } else {
            whatsappAction = `VM.toast('No WhatsApp number provided', 'warning')`;
        }
        
        if (cleanPhone) {
            callAction = `window.location.href = 'tel:${cleanPhone}'`;
        } else {
            callAction = `VM.toast('No phone number provided', 'warning')`;
        }
    }

    // Top action icons - always bright green and red as per user request
    // Check if photo is locked/hidden
    let currentUser = {};
    try { currentUser = JSON.parse(localStorage.getItem('userData') || '{}'); } catch(e) {}
    const isSelf = (member.id === currentUser.id) || (member.member_id === currentUser.member_id);
    const isPhotoLocked = !isSelf && (
        member.hide_photo === true || 
        member.hide_photo === 'true' || 
        member.profile_photo_locked === true || 
        member.profile_photo_locked === 'true'
    );

    const whatsappBtnClass = 'bg-green-500 hover:bg-green-600 hover:scale-105';
    const callBtnClass = 'bg-red-500 hover:bg-red-600 hover:scale-105';
    const lockIconHtml = (isLocked || isPhotoLocked) ? `<div class="absolute bottom-1 right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center border-2 border-gray-300 shadow"><i class="fas fa-lock text-gray-600 text-xs"></i></div>` : '';

    card.innerHTML = `
        ${plan.label ? `<div class="absolute -top-2 -left-2 bg-gradient-to-r ${plan.color} text-white px-3 py-1 rounded-full text-xs font-semibold shadow-md z-20 flex items-center gap-1"><i class="fas ${plan.icon}"></i> ${plan.label} Member</div>` : ''}
        
        <div class="absolute top-3 right-3 flex flex-col gap-2 z-10">
            <div class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shadow-md" title="Verified Profile"><i class="fas fa-check text-white text-sm"></i></div>
            ${scoreHtml}
        </div>

        <div class="flex justify-center pt-6 pb-3">
            <div class="relative">
                <div class="w-40 h-40 rounded-full overflow-hidden border-4 border-gray-200 bg-gray-100 shadow">
                    <img src="${imgSrc}" alt="${member.full_name}" class="w-full h-full object-cover" style="${isPhotoLocked ? 'filter: blur(12px) grayscale(50%); clip-path: circle(50% at 50% 50%); -webkit-clip-path: circle(50% at 50% 50%); pointer-events: none; -webkit-user-drag: none;' : ''}" onerror="this.onerror=null;this.src='${placeholder}'">
                </div>
                ${lockIconHtml}
            </div>
        </div>

        <div class="px-4 pb-4">
            <div class="flex items-center justify-between mb-1">
                <div class="flex flex-col truncate">
                    <h3 class="text-xl font-bold text-gray-900 truncate">${member.full_name || 'Member'}</h3>
                    <div class="flex gap-2 items-center mt-0.5">${genderLabel}</div>
                </div>
                <div class="flex gap-2 ml-2">
                    <button onclick="handleWhatsApp(event, '${memberId}')" class="w-9 h-9 rounded-full ${whatsappBtnClass} flex items-center justify-center shadow transition-all" title="WhatsApp"><i class="fab fa-whatsapp text-white text-base"></i></button>
                    <button onclick="handleCall(event, '${memberId}')" class="w-9 h-9 rounded-full ${callBtnClass} flex items-center justify-center shadow transition-all" title="Call"><i class="fas fa-phone text-white text-base"></i></button>
                </div>
            </div>
            
            <p class="text-pink-500 font-semibold text-sm mb-2">${memberId}</p>
            <p class="text-gray-700 text-sm leading-relaxed mb-3 min-h-[40px]">${details}</p>
            
            <div class="text-right mb-3">
                <span onclick="openProfileView('${memberId}')" class="text-cyan-500 font-semibold text-sm cursor-pointer hover:text-cyan-600 transition-colors">VIEW MORE</span>
            </div>

            <div class="flex gap-3">
                ${buildCardButtonsHtml(memberId, member.id, tab)}
            </div>
        </div>
    `;

    return card;
}

function buildCardButtonsHtml(memberId, dbId, tab) {
    const mainId = dbId || memberId;
    const secondaryId = memberId || dbId;
    if (tab === 'explore') {
        return `
            <button onclick="handleDecline('${mainId}', '${secondaryId}')" class="flex-1 py-2.5 rounded-full border-2 border-red-500 text-red-500 font-semibold hover:bg-red-50 transition-all duration-200 flex items-center justify-center gap-2" style="border-radius:25px;">
                <span style="font-size:18px">😞</span><span>Decline</span>
            </button>
            <button onclick="handleInterest('${mainId}', '${secondaryId}')" class="flex-1 py-2.5 rounded-full border-2 border-green-500 text-green-500 font-semibold hover:bg-green-50 transition-all duration-200 flex items-center justify-center gap-2" style="border-radius:25px;">
                <span style="font-size:18px">💖</span><span>Interest</span>
            </button>
        `;
    } else if (tab === 'interested') {
        return `
            <button onclick="handleDeclineFromInterested('${mainId}')" class="flex-1 py-2 border-2 border-red-400 text-red-500 rounded-full font-semibold hover:bg-red-50 transition-all duration-200 text-xs" style="border-radius:20px;">
                Move to Declined
            </button>
            <button onclick="handleRemoveFromList('${mainId}', 'interested')" class="flex-1 py-2 border-2 border-gray-300 text-gray-500 rounded-full font-semibold hover:bg-gray-50 transition-all duration-200 text-xs" style="border-radius:20px;">
                Remove
            </button>
        `;
    } else if (tab === 'declined') {
        return `
            <button onclick="handleRemoveFromList('${mainId}', 'declined')" class="flex-1 py-2 border-2 border-gray-300 text-gray-500 rounded-full font-semibold hover:bg-gray-50 transition-all duration-200 text-xs" style="border-radius:20px;">
                Restore to Explore
            </button>
            <button onclick="handleInterest('${mainId}', '${secondaryId}')" class="flex-1 py-2 border-2 border-green-500 text-green-500 rounded-full font-semibold hover:bg-green-50 transition-all duration-200 text-xs" style="border-radius:20px;">
                Interest
            </button>
        `;
    }
    return '';
}

window.handleDecline = async function(memberId, altId) {
    const btn = event?.currentTarget;
    const oldText = btn ? btn.innerHTML : 'Decline';
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        btn.disabled = true;
    }

    try {
        const token = localStorage.getItem('vm_token');
        const res = await fetch('/api/requests/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ receiver_id: memberId, status: 'declined' })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to decline profile');

        // Update local dbSentRequests
        const idsToUpdate = [memberId, altId].filter(Boolean).map(String);
        idsToUpdate.forEach(id => {
            const cleanId = id.replace(/^offline_/, '');
            const existing = dbSentRequests.find(r => r.receiver_id === id || r.receiver_id === cleanId || r.receiver_id === `offline_${cleanId}`);
            if (existing) {
                existing.status = 'declined';
            } else {
                dbSentRequests.push({ receiver_id: id, status: 'declined' });
            }
        });

        // Update stored lists
        const interestedList = getStoredList('interested').filter(id => !idsToUpdate.includes(String(id)));
        setStoredList('interested', interestedList);

        const declinedList = getStoredList('declined');
        idsToUpdate.forEach(id => {
            if (!declinedList.includes(id)) declinedList.push(id);
        });
        setStoredList('declined', declinedList);

        VM.toast('Profile moved to Declined tab', 'info');
        renderTab(currentTab);
    } catch (err) {
        console.error('Decline error:', err);
        if (btn) {
            btn.innerHTML = oldText;
            btn.disabled = false;
        }
        VM.toast(err.message, 'error');
    }
};

window.handleInterest = async function(memberId, altId) {
    let currentUser = {};
    try { currentUser = JSON.parse(localStorage.getItem('userData') || localStorage.getItem('vm_user') || '{}'); } catch(e) {}
    const userPlan = (currentUser.plan_name || 'free').toLowerCase();
    if (userPlan === 'free') {
        if (window.showUpgradeModal) {
            window.showUpgradeModal(
                'Upgrade Required to Express Interest',
                'Sending interest requests requires an active membership plan. Please upgrade to connect.',
                'Upgrade Plan'
            );
        } else {
            VM.toast('Sending interest requests requires an active membership plan.', 'warning');
            setTimeout(() => { window.location.href = 'membership.html'; }, 1500);
        }
        return;
    }

    const btn = event?.currentTarget;
    const oldText = btn ? btn.innerHTML : 'Interest';
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        btn.disabled = true;
    }

    try {
        const token = localStorage.getItem('vm_token');
        const res = await fetch('/api/requests/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ receiver_id: memberId })
        });

        const data = await res.json();
        if (!res.ok) {
            if (data.code === 'UPGRADE_REQUIRED' || res.status === 403) {
                if (window.showUpgradeModal) {
                    window.showUpgradeModal('Upgrade Required', data.error || data.message, 'Upgrade Plan');
                    if (btn) {
                        btn.innerHTML = oldText;
                        btn.disabled = false;
                    }
                    return;
                }
            }
            throw new Error(data.error || 'Failed to send interest request');
        }

        const idsToUpdate = [memberId, altId].filter(Boolean).map(String);
        idsToUpdate.forEach(id => {
            const cleanId = id.replace(/^offline_/, '');
            const existing = dbSentRequests.find(r => r.receiver_id === id || r.receiver_id === cleanId || r.receiver_id === `offline_${cleanId}`);
            if (existing) {
                existing.status = 'accepted';
            } else {
                dbSentRequests.push({ receiver_id: id, status: 'accepted' });
            }
        });

        // Update stored lists
        const declinedList = getStoredList('declined').filter(id => !idsToUpdate.includes(String(id)));
        setStoredList('declined', declinedList);

        const interestedList = getStoredList('interested');
        idsToUpdate.forEach(id => {
            if (!interestedList.includes(id)) interestedList.push(id);
        });
        setStoredList('interested', interestedList);

        VM.toast('Profile moved to Interested tab. Connected!', 'success');
        renderTab(currentTab);
    } catch (err) {
        console.error('Interest error:', err);
        if (btn) {
            btn.innerHTML = oldText;
            btn.disabled = false;
        }
        VM.toast(err.message, 'error');
    }
};

window.handleDeclineFromInterested = async function(memberId) {
    try {
        const token = localStorage.getItem('vm_token');
        const isOffline = memberId.toString().startsWith('offline_');

        if (isOffline) {
            // Update offline_interests status to declined
            const res = await fetch('/api/requests/update-offline', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ offline_member_id: memberId, status: 'declined' })
            });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error || 'Failed to move to declined');
            }
        } else {
            // For regular profiles: use cancel then re-send as declined
            const req = dbSentRequests.find(r => r.receiver_id === memberId);
            if (req && req.id) {
                await fetch('/api/requests/cancel', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ request_id: req.id })
                });
            }
            const res = await fetch('/api/requests/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ receiver_id: memberId, status: 'declined' })
            });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error || 'Failed to move to declined');
            }
        }

        // Update local dbSentRequests
        const cleanId = String(memberId).replace(/^offline_/, '');
        const withPrefix = `offline_${cleanId}`;
        const entry = dbSentRequests.find(r => r.receiver_id === memberId || r.receiver_id === cleanId || r.receiver_id === withPrefix);
        if (entry) {
            entry.status = 'declined';
        } else {
            dbSentRequests.push({ receiver_id: memberId, status: 'declined' });
        }

        // Remove from interested, add to declined in localStorage
        const interestedList = getStoredList('interested').filter(id => id !== memberId && id !== cleanId && id !== withPrefix);
        setStoredList('interested', interestedList);

        const declinedList = getStoredList('declined');
        if (!declinedList.includes(memberId)) declinedList.push(memberId);
        setStoredList('declined', declinedList);

        VM.toast('Profile moved to Declined', 'info');
        renderTab(currentTab);
    } catch (err) {
        console.error('Decline from interested error:', err);
        VM.toast(err.message, 'error');
    }
};

window.handleRemoveFromList = async function(memberId, type) {
    try {
        const token = localStorage.getItem('vm_token');
        const isOffline = memberId.toString().startsWith('offline_');

        if (isOffline) {
            // Delete from offline_interests table
            const res = await fetch('/api/requests/remove-offline', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ offline_member_id: memberId })
            });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error || 'Failed to remove');
            }
        } else {
            // Find and cancel the existing regular request
            const req = dbSentRequests.find(r => r.receiver_id === memberId);
            if (req && req.id) {
                const res = await fetch('/api/requests/cancel', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ request_id: req.id })
                });
                if (!res.ok) {
                    const d = await res.json();
                    throw new Error(d.error || 'Failed to remove');
                }
            }
        }

        // Remove from local dbSentRequests
        const cleanId = String(memberId).replace(/^offline_/, '');
        const withPrefix = `offline_${cleanId}`;
        dbSentRequests = dbSentRequests.filter(r => r.receiver_id !== memberId && r.receiver_id !== cleanId && r.receiver_id !== withPrefix);

        // Remove from both stored lists
        const interestedList = getStoredList('interested').filter(id => id !== memberId && id !== cleanId && id !== withPrefix);
        setStoredList('interested', interestedList);

        const declinedList = getStoredList('declined').filter(id => id !== memberId && id !== cleanId && id !== withPrefix);
        setStoredList('declined', declinedList);

        VM.toast(type === 'declined' ? 'Profile restored to Explore' : 'Interest removed', 'success');
        renderTab(currentTab);
    } catch (err) {
        console.error('Remove from list error:', err);
        VM.toast(err.message, 'error');
    }
};

function openProfileView(memberId) {
    if (window.fullProfileModal) {
        window.fullProfileModal.open(memberId);
    }
}

function handleContactClick(memberId) {
    openProfileView(memberId);
}

function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) modal.classList.add('hidden');
}

window.handleLogout = async () => {
     localStorage.clear();
     window.location.href = 'login.html';
};

window.handleOnlineToggleClick = async () => {
    const badge = document.getElementById('onlineStatusBadge'),
          btn = document.getElementById('onlineToggleBtn'),
          slider = document.getElementById('toggleSlider');
    const isOnline = badge.textContent === 'Online';
    badge.textContent = isOnline ? 'Offline' : 'Online';
    btn.style.backgroundColor = isOnline ? '#9ca3af' : '#22c55e';
    slider.style.marginLeft = isOnline ? '1.625rem' : '0.125rem';
};
