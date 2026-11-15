/**
 * astro-match.js
 * Tamil 10 Porutham — Astro Match Feature
 * Frontend logic for the Astro Match tab in Active Members Dashboard
 *
 * Loaded only when user clicks the "Astro Match" tab.
 * No AI, no LLM. Pure deterministic rule-based display.
 */

(function () {
    'use strict';

    // ── State ─────────────────────────────────────────────────────
    let allCandidates = [];
    let myAstroData = null;
    let currentFilter = { rasi: '', star: '', minScore: 0, classification: '' };
    let isLoaded = false;

    // ── Reference data for filter dropdowns ─────────────────────
    const RASI_LIST = [
        'Mesha', 'Rishabha', 'Mithuna', 'Kataka', 'Simha', 'Kanya',
        'Tula', 'Vrischika', 'Dhanus', 'Makara', 'Kumbha', 'Meena'
    ];

    const NAKSHATRA_LIST = [
        'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
        'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
        'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
        'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta',
        'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
    ];

    const PORUTHAM_NAMES = {
        DINA:          { label: 'Dina / Tara',     icon: 'fa-star',          weight: 'Medium' },
        GANA:          { label: 'Gana',             icon: 'fa-users',         weight: 'High'   },
        MAHENDRA:      { label: 'Mahendra',         icon: 'fa-crown',         weight: 'High'   },
        STREE_DEERGHA: { label: 'Stree Deergha',    icon: 'fa-ruler',         weight: 'Medium' },
        YONI:          { label: 'Yoni',             icon: 'fa-heart',         weight: 'High'   },
        RASI:          { label: 'Rasi',             icon: 'fa-moon',          weight: 'Medium' },
        RASI_ADHIPATHI:{ label: 'Rasi Adhipathi',   icon: 'fa-planet-ringed', weight: 'Medium' },
        VASIYA:        { label: 'Vasiya',           icon: 'fa-magnet',        weight: 'Medium' },
        RAJJU:         { label: 'Rajju',            icon: 'fa-link',          weight: 'Critical'},
        VEDHA:         { label: 'Vedha',            icon: 'fa-ban',           weight: 'Critical'}
    };

    // ── Status styling ───────────────────────────────────────────
    function getStatusStyle(status) {
        switch (status) {
            case 'MATCH':          return { bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-200',  icon: 'fa-check-circle',       label: 'Match'           };
            case 'PARTIAL':        return { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', icon: 'fa-exclamation-circle', label: 'Partial Match'   };
            case 'NO_MATCH':       return { bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-200',    icon: 'fa-times-circle',       label: 'No Match'        };
            case 'NOT_CONFIGURED': return { bg: 'bg-gray-100',   text: 'text-gray-500',   border: 'border-gray-200',   icon: 'fa-question-circle',    label: 'Not Configured'  };
            case 'REVIEW':         return { bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-200',   icon: 'fa-info-circle',        label: 'Review'          };
            default:               return { bg: 'bg-gray-100',   text: 'text-gray-500',   border: 'border-gray-200',   icon: 'fa-question-circle',    label: status            };
        }
    }

    function getClassificationStyle(c) {
        switch (c) {
            case 'HIGH':          return { text: 'text-green-600', bg: 'bg-green-50',  border: 'border-green-200', label: 'High Compatibility'     };
            case 'MODERATE':      return { text: 'text-yellow-600',bg: 'bg-yellow-50', border: 'border-yellow-200',label: 'Moderate Compatibility' };
            case 'LOW':           return { text: 'text-red-600',   bg: 'bg-red-50',    border: 'border-red-200',   label: 'Low Compatibility'      };
            case 'CANNOT_ASSESS': return { text: 'text-gray-500',  bg: 'bg-gray-50',   border: 'border-gray-200',  label: 'Cannot Assess'          };
            default:              return { text: 'text-gray-500',  bg: 'bg-gray-50',   border: 'border-gray-200',  label: c || 'Unknown'           };
        }
    }

    // ── Tab Initialization ────────────────────────────────────────
    window.initAstroMatch = async function () {
        if (isLoaded) {
            renderAstroMatchContainer();
            return;
        }
        isLoaded = true;
        renderAstroMatchContainer();
        await loadAstroMatchData();
    };

    function renderAstroMatchContainer() {
        const container = document.getElementById('membersContainer');
        const emptyState = document.getElementById('emptyState');
        const loadingState = document.getElementById('loadingState');
        if (emptyState) emptyState.classList.add('hidden');
        if (loadingState) loadingState.classList.add('hidden');
        if (!container) return;

        container.innerHTML = `
        <div id="astroMatchWrapper" class="col-span-full w-full">
            <!-- My Astro Data Banner -->
            <div id="astroMyDataBanner" class="mb-6 glass-card rounded-2xl p-6 animate-in">
                <div class="flex items-center gap-4">
                    <div class="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                        <i class="fas fa-star text-white text-xl"></i>
                    </div>
                    <div class="flex-1">
                        <h3 class="text-lg font-bold text-gray-900">Your Astro Profile</h3>
                        <p id="astroMyDataText" class="text-gray-500 text-sm">Loading your Rasi & Nakshatra...</p>
                    </div>
                    <div id="astroMyDataBadge"></div>
                </div>
            </div>

            <!-- Disclaimer -->
            <div class="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 leading-relaxed">
                <i class="fas fa-info-circle mr-1"></i>
                <strong>Traditional Guidance Only:</strong> Porutham is a traditional astrology-based practice. Results are traditional astrological indications only — not a guarantee of marital success, health, or relationship quality. Always make relationship decisions based on consent, values, and practical compatibility.
            </div>

            <!-- Filters -->
            <div id="astroFilters" class="mb-6 bg-white p-5 rounded-2xl shadow-sm border border-gray-100 animate-in">
                <div class="flex items-center gap-2 mb-4">
                    <i class="fas fa-filter text-pink-500"></i>
                    <span class="font-bold text-gray-700 text-sm">Astro Match Filters</span>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <label class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Rasi</label>
                        <select id="astroFilterRasi" class="w-full p-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-pink-500 outline-none">
                            <option value="">Any Rasi</option>
                            ${RASI_LIST.map(r => `<option value="${r}">${r}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Nakshatra</label>
                        <select id="astroFilterStar" class="w-full p-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-pink-500 outline-none">
                            <option value="">Any Star</option>
                            ${NAKSHATRA_LIST.map(s => `<option value="${s}">${s}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Min. Score</label>
                        <select id="astroFilterMinScore" class="w-full p-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-pink-500 outline-none">
                            <option value="0">Any Score</option>
                            <option value="40">40%+ (Moderate+)</option>
                            <option value="70">70%+ (High)</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Classification</label>
                        <select id="astroFilterClass" class="w-full p-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-pink-500 outline-none">
                            <option value="">All</option>
                            <option value="HIGH">High Compatibility</option>
                            <option value="MODERATE">Moderate</option>
                            <option value="LOW">Low</option>
                        </select>
                    </div>
                </div>
                <div class="flex justify-end gap-3 mt-4">
                    <button onclick="clearAstroFilters()" class="px-5 py-2 text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors">Clear</button>
                    <button onclick="applyAstroFilters()" class="bg-gradient-to-r from-pink-600 to-pink-700 text-white px-7 py-2.5 rounded-xl text-sm font-bold hover:shadow-lg transition-all">Apply Filters</button>
                </div>
            </div>

            <!-- Results Count -->
            <div id="astroResultsCount" class="mb-4 text-sm text-gray-500 font-medium hidden">
                <i class="fas fa-moon text-indigo-400 mr-1"></i>
                Showing <span id="astroCount" class="font-bold text-gray-800">0</span> compatible profiles
            </div>

            <!-- Loading -->
            <div id="astroLoadingState" class="flex flex-col items-center justify-center py-20">
                <div class="w-16 h-16 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin shadow-sm"></div>
                <p class="mt-6 text-gray-500 font-medium">Calculating astro compatibility...</p>
            </div>

            <!-- No astro data state -->
            <div id="astroNoDataState" class="hidden flex flex-col items-center justify-center py-16 text-center">
                <div class="w-24 h-24 bg-indigo-100 rounded-[2rem] flex items-center justify-center mb-6 shadow-sm">
                    <i class="fas fa-star text-4xl text-indigo-400"></i>
                </div>
                <h3 class="text-xl font-bold text-gray-900 mb-2">Your Rasi & Nakshatra Not Set</h3>
                <p class="text-gray-500 max-w-md mb-6">To use Astro Match, please add your Rasi and Nakshatra (Birth Star) to your profile first.</p>
                <a href="account-settings.html" class="bg-gradient-to-r from-pink-600 to-pink-700 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg transition-all">Update Profile</a>
            </div>

            <!-- Candidates Grid -->
            <div id="astroCandidatesGrid" class="hidden grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"></div>

            <!-- Empty Results State -->
            <div id="astroEmptyResults" class="hidden flex flex-col items-center justify-center py-16 text-center">
                <div class="w-24 h-24 bg-pink-100 rounded-[2rem] flex items-center justify-center mb-6 shadow-sm">
                    <i class="fas fa-search text-4xl text-pink-400"></i>
                </div>
                <h3 class="text-xl font-bold text-gray-900 mb-2">No Matching Profiles</h3>
                <p class="text-gray-500 max-w-md">No candidates found with the current Astro Match filters. Try adjusting the filters or check back as more profiles are added.</p>
            </div>
        </div>`;

        // Wire filter events
        document.getElementById('astroFilterRasi')?.addEventListener('change', () => {});
        document.getElementById('astroFilterStar')?.addEventListener('change', () => {});
    }

    // ── Load Data ─────────────────────────────────────────────────
    async function loadAstroMatchData() {
        try {
            const token = localStorage.getItem('vm_token');
            if (!token) return;

            const headers = { Authorization: `Bearer ${token}` };

            // Fetch my astro data and candidates in parallel
            const [myRes, candidatesRes] = await Promise.all([
                fetch('/api/astro-match/my-data', { headers }),
                fetch('/api/astro-match/candidates', { headers })
            ]);

            const myData = await myRes.json();
            const candidatesData = await candidatesRes.json();

            myAstroData = myData;

            // Update "My Astro Data" banner
            updateMyAstroBanner(myData);

            // Hide loading
            const loading = document.getElementById('astroLoadingState');
            if (loading) loading.classList.add('hidden');

            if (!myData.hasAstroData) {
                // Show no-data state
                const noData = document.getElementById('astroNoDataState');
                if (noData) noData.classList.remove('hidden');
                return;
            }

            allCandidates = candidatesData.candidates || [];
            renderAstroCandidates(allCandidates);

        } catch (err) {
            console.error('[AstroMatch] Load error:', err);
            const loading = document.getElementById('astroLoadingState');
            if (loading) loading.innerHTML = `
                <div class="text-center text-red-500 p-8">
                    <i class="fas fa-exclamation-circle text-4xl mb-4"></i>
                    <p class="font-bold">Failed to load Astro Match</p>
                    <p class="text-sm opacity-70">${err.message}</p>
                    <button onclick="window.initAstroMatch()" class="mt-4 bg-pink-600 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-pink-700">Retry</button>
                </div>`;
        }
    }

    function updateMyAstroBanner(myData) {
        const textEl = document.getElementById('astroMyDataText');
        const badgeEl = document.getElementById('astroMyDataBadge');
        if (!textEl) return;

        if (myData.hasAstroData) {
            const p = myData.profile;
            textEl.innerHTML = `
                <span class="font-semibold text-gray-700">Rasi:</span> ${p.rasi}
                &nbsp;|&nbsp;
                <span class="font-semibold text-gray-700">Star:</span> ${p.star}
                ${p.gana ? `&nbsp;|&nbsp;<span class="font-semibold text-gray-700">Gana:</span> ${p.gana}` : ''}
                ${p.rajju ? `&nbsp;|&nbsp;<span class="font-semibold text-gray-700">Rajju:</span> ${p.rajju}` : ''}
            `;
            if (badgeEl) badgeEl.innerHTML = `<span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold"><i class="fas fa-check mr-1"></i>Astro Data Available</span>`;
        } else {
            textEl.innerHTML = `<span class="text-orange-500">Your Rasi and Nakshatra are not set. <a href="account-settings.html" class="underline font-semibold">Update your profile</a> to enable Astro Match.</span>`;
            if (badgeEl) badgeEl.innerHTML = `<span class="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold"><i class="fas fa-exclamation-triangle mr-1"></i>Incomplete</span>`;
        }
    }

    // ── Render Candidates ─────────────────────────────────────────
    function renderAstroCandidates(candidates) {
        const grid = document.getElementById('astroCandidatesGrid');
        const empty = document.getElementById('astroEmptyResults');
        const countEl = document.getElementById('astroResultsCount');
        const countNum = document.getElementById('astroCount');
        if (!grid) return;

        grid.innerHTML = '';

        if (!candidates || candidates.length === 0) {
            grid.classList.add('hidden');
            if (empty) empty.classList.remove('hidden');
            if (countEl) countEl.classList.add('hidden');
            return;
        }

        grid.classList.remove('hidden');
        if (empty) empty.classList.add('hidden');
        if (countEl) countEl.classList.remove('hidden');
        if (countNum) countNum.textContent = candidates.length;

        candidates.forEach(candidate => {
            const card = buildAstroCard(candidate);
            grid.appendChild(card);
        });
    }

    function buildAstroCard(candidate) {
        const am = candidate.astro_match;
        const hasMatch = !!(am && am.score !== null);
        const cls = hasMatch ? getClassificationStyle(am.classification) : getClassificationStyle('CANNOT_ASSESS');
        const scoreText = hasMatch ? `${am.score.toFixed(0)}%` : 'N/A';
        const scoreColor = hasMatch
            ? (am.score >= 70 ? 'text-green-600' : am.score >= 40 ? 'text-yellow-600' : 'text-red-500')
            : 'text-gray-400';

        const imgSrc = candidate.profile_picture_url || '/images/placeholder-profile.svg';
        const age = candidate.age ? `${candidate.age} yrs` : '';
        const location = [candidate.city, candidate.state].filter(Boolean).join(', ');
        const details = [age, candidate.caste, candidate.education, location].filter(Boolean).join(' · ') || 'Details hidden';

        // Mini porutham summary pills
        let miniPills = '';
        if (hasMatch && am.matched !== undefined) {
            miniPills = `
                <div class="flex items-center gap-2 flex-wrap mt-2">
                    <span class="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full"><i class="fas fa-check mr-0.5"></i>${am.matched} Match${am.matched !== 1 ? 'es' : ''}</span>
                    ${am.partial > 0 ? `<span class="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-0.5 rounded-full"><i class="fas fa-adjust mr-0.5"></i>${am.partial} Partial</span>` : ''}
                    ${am.notMatched > 0 ? `<span class="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full"><i class="fas fa-times mr-0.5"></i>${am.notMatched} No Match</span>` : ''}
                </div>`;
        }

        const warningHtml = am && am.warnings && am.warnings.length > 0
            ? `<div class="mt-2 text-xs text-orange-600 bg-orange-50 rounded-lg px-2 py-1"><i class="fas fa-exclamation-triangle mr-1"></i>${am.warnings[0]}</div>`
            : '';

        const card = document.createElement('div');
        card.className = 'bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 relative animate-in';
        card.innerHTML = `
            <!-- Score Badge -->
            <div class="absolute top-3 right-3 z-10">
                <div class="bg-white shadow-lg rounded-xl px-3 py-2 text-center border ${cls.border}">
                    <div class="${scoreColor} text-2xl font-black leading-none">${scoreText}</div>
                    <div class="text-gray-400 text-xs mt-0.5">Porutham</div>
                </div>
            </div>

            <!-- Photo -->
            <div class="flex justify-center pt-6 pb-3">
                <div class="relative">
                    <div class="w-28 h-28 rounded-full overflow-hidden border-4 border-indigo-100 bg-gray-100 shadow">
                        <img src="${imgSrc}" alt="${candidate.full_name || 'Member'}"
                            class="w-full h-full object-cover"
                            onerror="this.onerror=null;this.src='/images/placeholder-profile.svg'">
                    </div>
                    <div class="absolute -bottom-1 -right-1 w-7 h-7 bg-indigo-500 rounded-full flex items-center justify-center border-2 border-white shadow">
                        <i class="fas fa-star text-white text-xs"></i>
                    </div>
                </div>
            </div>

            <div class="px-5 pb-5">
                <!-- Name & ID -->
                <div class="text-center mb-2">
                    <h3 class="text-lg font-bold text-gray-900 truncate">${candidate.full_name || 'Member'}</h3>
                    <p class="text-pink-500 font-semibold text-xs">${candidate.member_id || ''}</p>
                </div>

                <!-- Astro Data -->
                <div class="bg-indigo-50 rounded-xl p-3 mb-3">
                    <div class="flex items-center justify-between text-xs">
                        <div>
                            <span class="text-indigo-500 font-bold">Rasi:</span>
                            <span class="text-gray-700 ml-1">${candidate.rasi || 'Not set'}</span>
                        </div>
                        <div>
                            <span class="text-indigo-500 font-bold">Star:</span>
                            <span class="text-gray-700 ml-1">${candidate.star || 'Not set'}</span>
                        </div>
                    </div>
                    ${miniPills}
                    ${warningHtml}
                </div>

                <!-- Classification -->
                <div class="mb-3">
                    <div class="flex items-center justify-between">
                        <span class="${cls.text} ${cls.bg} ${cls.border} border text-xs font-bold px-3 py-1 rounded-full">${cls.label}</span>
                        <span class="text-gray-400 text-xs">${details}</span>
                    </div>
                </div>

                <!-- Actions -->
                <div class="flex gap-2">
                    <button
                        class="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold hover:shadow-lg transition-all"
                        onclick="showAstroDetail('${candidate.member_id}')">
                        <i class="fas fa-moon mr-1.5"></i>View Details
                    </button>
                    <button
                        class="px-4 py-2.5 rounded-xl border-2 border-pink-200 text-pink-600 text-sm font-bold hover:bg-pink-50 transition-all"
                        onclick="openProfileFromAstro('${candidate.member_id}')">
                        <i class="fas fa-user"></i>
                    </button>
                </div>
            </div>`;

        return card;
    }

    // ── Detailed Porutham Modal ───────────────────────────────────
    window.showAstroDetail = async function (memberId) {
        const candidate = allCandidates.find(c => c.member_id == memberId);
        if (!candidate) return;

        // If we have cached result, use it. Otherwise, recalculate.
        let matchResult = null;
        const token = localStorage.getItem('vm_token');
        if (!token) return;

        // Determine bride/groom orientation based on current user gender
        const myGender = (myAstroData?.profile?.gender || '').toLowerCase();
        const isBride = myGender === 'female' || myGender.includes('female');

        const brideRasi  = isBride ? myAstroData.profile.rasi  : candidate.rasi;
        const brideStar  = isBride ? myAstroData.profile.star  : candidate.star;
        const groomRasi  = isBride ? candidate.rasi  : myAstroData.profile.rasi;
        const groomStar  = isBride ? candidate.star  : myAstroData.profile.star;
        const brideName  = isBride ? myAstroData.profile.full_name : candidate.full_name;
        const groomName  = isBride ? candidate.full_name : myAstroData.profile.full_name;

        try {
            const res = await fetch('/api/astro-match/calculate', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ bride_rasi: brideRasi, bride_star: brideStar, groom_rasi: groomRasi, groom_star: groomStar })
            });
            matchResult = await res.json();
        } catch (err) {
            console.error('[AstroMatch] Calculate error:', err);
        }

        openAstroDetailModal(candidate, matchResult, brideName, groomName);
    };

    function openAstroDetailModal(candidate, matchResult, brideName, groomName) {
        // Remove existing modal if any
        const existing = document.getElementById('astroDetailModal');
        if (existing) existing.remove();

        const overall = matchResult?.overall || {};
        const cls = getClassificationStyle(overall.classification || 'CANNOT_ASSESS');
        const score = overall.score !== null && overall.score !== undefined ? `${overall.score.toFixed(1)}%` : 'N/A';

        // Build porutham rows
        const poruthams = matchResult?.poruthams || [];
        let poruthamsHtml = '';
        for (const p of poruthams) {
            const info = PORUTHAM_NAMES[p.code] || { label: p.code, icon: 'fa-circle', weight: '' };
            const st = getStatusStyle(p.status);
            poruthamsHtml += `
            <div class="bg-white rounded-xl border ${st.border} p-4 hover:shadow-sm transition-all">
                <div class="flex items-start justify-between gap-3">
                    <div class="flex items-center gap-3 flex-1">
                        <div class="${st.bg} w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0">
                            <i class="fas ${info.icon} ${st.text} text-sm"></i>
                        </div>
                        <div>
                            <div class="font-bold text-gray-900 text-sm">${info.label}</div>
                            ${info.weight ? `<div class="text-xs text-gray-400">${info.weight} priority</div>` : ''}
                        </div>
                    </div>
                    <span class="${st.bg} ${st.text} text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">${st.label}</span>
                </div>
                <p class="mt-3 text-xs text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-2">${p.explanation || ''}</p>
                ${p.starCount !== undefined ? `<p class="mt-1 text-xs text-indigo-500 font-semibold">Star count: ${p.starCount}</p>` : ''}
            </div>`;
        }

        // Warnings
        let warningsHtml = '';
        if (matchResult?.warnings?.length > 0) {
            warningsHtml = `<div class="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
                <div class="font-bold text-orange-700 text-sm mb-2"><i class="fas fa-exclamation-triangle mr-1"></i>Warnings</div>
                ${matchResult.warnings.map(w => `<p class="text-xs text-orange-600">${w}</p>`).join('')}
            </div>`;
        }

        const imgSrc = candidate.profile_picture_url || '/images/placeholder-profile.svg';

        const modal = document.createElement('div');
        modal.id = 'astroDetailModal';
        modal.className = 'fixed inset-0 z-[200] flex items-center justify-center p-4';
        modal.innerHTML = `
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" onclick="closeAstroDetailModal()"></div>
        <div class="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col" style="max-height:90vh;">
            <!-- Header -->
            <div class="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-6 text-white flex-shrink-0">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-xl font-bold">10 Porutham Analysis</h2>
                    <button onclick="closeAstroDetailModal()" class="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition">
                        <i class="fas fa-times text-white"></i>
                    </button>
                </div>
                <div class="flex items-center gap-4">
                    <img src="${imgSrc}" class="w-16 h-16 rounded-full border-3 border-white/60 object-cover"
                        onerror="this.onerror=null;this.src='/images/placeholder-profile.svg'">
                    <div>
                        <p class="font-bold text-lg">${candidate.full_name || 'Member'}</p>
                        <p class="text-white/80 text-sm">${candidate.member_id || ''} · ${candidate.rasi || ''} · ${candidate.star || ''}</p>
                        <p class="text-white/60 text-xs mt-0.5">Bride: ${brideName} → Groom: ${groomName}</p>
                    </div>
                </div>
            </div>

            <!-- Score Summary -->
            <div class="bg-gray-50 px-6 py-4 border-b border-gray-100 flex-shrink-0">
                <div class="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <p class="text-xs text-gray-500 font-semibold uppercase tracking-wider">Overall Compatibility</p>
                        <p class="text-4xl font-black ${cls.text}">${score}</p>
                        <p class="${cls.text} ${cls.bg} ${cls.border} border inline-block text-xs font-bold px-3 py-1 rounded-full mt-1">${cls.label}</p>
                    </div>
                    <div class="flex gap-4 text-center">
                        <div class="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                            <div class="text-2xl font-black text-green-600">${overall.matched ?? 0}</div>
                            <div class="text-xs text-green-500 font-semibold">Match</div>
                        </div>
                        <div class="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
                            <div class="text-2xl font-black text-yellow-600">${overall.partial ?? 0}</div>
                            <div class="text-xs text-yellow-500 font-semibold">Partial</div>
                        </div>
                        <div class="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                            <div class="text-2xl font-black text-red-500">${overall.notMatched ?? 0}</div>
                            <div class="text-xs text-red-400 font-semibold">No Match</div>
                        </div>
                    </div>
                </div>
                <p class="text-xs text-gray-400 mt-2">Ruleset: <span class="font-mono">${matchResult?.ruleset || 'N/A'}</span> · Assessed: ${overall.assessed ?? 0}/10 checks</p>
            </div>

            <!-- Scrollable Content -->
            <div class="flex-1 overflow-y-auto p-6">
                ${warningsHtml}
                <div class="space-y-3">
                    ${poruthamsHtml || '<p class="text-center text-gray-400 py-8">No calculation results available.</p>'}
                </div>
                <!-- Action -->
                <div class="mt-6 flex gap-3">
                    <button onclick="openProfileFromAstro('${candidate.member_id}'); closeAstroDetailModal();"
                        class="flex-1 bg-gradient-to-r from-pink-600 to-pink-700 text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all">
                        <i class="fas fa-user mr-2"></i>View Full Profile
                    </button>
                    <button onclick="closeAstroDetailModal()" class="px-6 py-3 rounded-xl border-2 border-gray-200 text-gray-500 font-bold hover:bg-gray-50 transition-all">Close</button>
                </div>
            </div>
        </div>`;

        document.body.appendChild(modal);
    }

    window.closeAstroDetailModal = function () {
        const modal = document.getElementById('astroDetailModal');
        if (modal) modal.remove();
    };

    // ── Open profile modal via existing fullProfileModal ─────────
    window.openProfileFromAstro = function (memberId) {
        if (window.fullProfileModal) {
            window.fullProfileModal.open(memberId);
        } else {
            console.error('[AstroMatch] fullProfileModal not loaded');
        }
    };

    // ── Filter Handlers ───────────────────────────────────────────
    window.applyAstroFilters = function () {
        const rasi     = document.getElementById('astroFilterRasi')?.value || '';
        const star     = document.getElementById('astroFilterStar')?.value || '';
        const minScore = parseFloat(document.getElementById('astroFilterMinScore')?.value || '0');
        const cls      = document.getElementById('astroFilterClass')?.value || '';

        let filtered = [...allCandidates];

        if (rasi) filtered = filtered.filter(c => c.rasi && c.rasi.toLowerCase() === rasi.toLowerCase());
        if (star) filtered = filtered.filter(c => c.star && c.star.toLowerCase() === star.toLowerCase());
        if (minScore > 0) filtered = filtered.filter(c => c.astro_match && c.astro_match.score !== null && c.astro_match.score >= minScore);
        if (cls) filtered = filtered.filter(c => c.astro_match && c.astro_match.classification === cls);

        renderAstroCandidates(filtered);
    };

    window.clearAstroFilters = function () {
        const fields = ['astroFilterRasi', 'astroFilterStar', 'astroFilterMinScore', 'astroFilterClass'];
        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = el.tagName === 'SELECT' ? (el.options[0]?.value || '') : '';
        });
        renderAstroCandidates(allCandidates);
    };

    // ── Keyboard shortcut: Escape to close modal ──────────────────
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') window.closeAstroDetailModal?.();
    });

    console.log('[AstroMatch] ✅ Astro Match module loaded.');
})();
