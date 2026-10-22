const router = require('express').Router();
const { supabaseAdmin } = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

// Timeout constants
const TIMEOUT_MS = {
    QUERY: 15000,      // 15 seconds for database queries
};

// Helper: wrap promise with timeout
function withTimeout(promise, timeoutMs, operation) {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`${operation} timeout (${timeoutMs}ms)`)), timeoutMs)
        )
    ]);
}

// ══════════════════════════════════════════════════════════════
// COMPATIBILITY SCORING ENGINE
// ══════════════════════════════════════════════════════════════
function calculateMatchScore(user, target) {
    let score = 0;
    const weights = {
        caste: 25,
        age: 20,
        religion: 15,
        location: 15,
        education: 15,
        mother_tongue: 10
    };

    // 1. Caste (25%)
    if (user.preferred_caste === 'same-caste' && user.caste && target.caste === user.caste) {
        score += weights.caste;
    } else if (user.preferred_caste && target.caste && target.caste.toLowerCase().includes(user.preferred_caste.toLowerCase())) {
        score += weights.caste;
    } else if (user.preferred_caste === 'any-caste') {
        score += weights.caste;
    }

    // 2. Age (20%)
    const targetAge = target.date_of_birth ? Math.floor((Date.now() - new Date(target.date_of_birth)) / 31557600000) : null;
    if (targetAge && user.preferred_age_from && user.preferred_age_to) {
        const from = parseInt(user.preferred_age_from);
        const to = parseInt(user.preferred_age_to);
        if (targetAge >= from && targetAge <= to) {
            score += weights.age;
        } else if (Math.abs(targetAge - from) <= 2 || Math.abs(targetAge - to) <= 2) {
            score += 10; // Partial match
        }
    }

    // 3. Religion (15%)
    if (target.religion && user.religion && target.religion.toLowerCase().includes(user.religion.toLowerCase())) {
        score += weights.religion;
    }

    // 4. Location (15%)
    if (target.city && user.city && target.city.toLowerCase() === user.city.toLowerCase()) {
        score += weights.location;
    } else if (target.state && user.state && target.state.toLowerCase() === user.state.toLowerCase()) {
        score += 10;
    } else if (user.preferred_location === 'any-location') {
        score += weights.location;
    }

    // 5. Education (15%)
    if (target.education && user.preferred_education) {
        if (target.education.toLowerCase().includes(user.preferred_education.toLowerCase()) || user.preferred_education === 'any-education') {
            score += weights.education;
        }
    } else if (!user.preferred_education || user.preferred_education === 'any-education') {
        score += weights.education;
    }

    // 6. Mother Tongue (10%)
    if (target.mother_tongue && user.mother_tongue && target.mother_tongue.toLowerCase() === user.mother_tongue.toLowerCase()) {
        score += weights.mother_tongue;
    } else if (user.preferred_mother_tongue === 'any-language') {
        score += weights.mother_tongue;
    }

    return Math.min(score, 100);
}

// ══════════════════════════════════════════════════════════════
// RECOMMENDED MATCHES — GET /api/matches/recommended
// Automatically filters based on the logged-in user's preferences
// ══════════════════════════════════════════════════════════════
router.get('/recommended', requireAuth, async (req, res) => {
    try {
        // 1. Fetch current user's preferences
        const { data: user, error: userErr } = await withTimeout(
            supabaseAdmin
                .from('profiles')
                .select('*')
                .eq('id', req.userId)
                .single(),
            TIMEOUT_MS.QUERY,
            'getPreferences'
        );

        if (userErr || !user) {
            return res.status(404).json({ error: 'User profile not found' });
        }

        // 2. Determine target gender
        let targetGender = null;
        if (user && user.gender) {
            const g = user.gender.toLowerCase();
            if (g === 'male' || (g.includes('male') && !g.includes('female'))) targetGender = 'Female';
            else if (g === 'female' || g.includes('female')) targetGender = 'Male';
        }

        // 3. Build Query
        let query = supabaseAdmin
            .from('profiles')
            .select(`
                id, member_id, full_name, gender, date_of_birth,
                height, body_type, skin_colour, marital_status,
                religion, caste, mother_tongue,
                education, employment_status, annual_income, job_roles,
                city, state, native_place,
                rasi, star, family_type,
                profile_picture_url, profile_status, plan_name,
                about_myself, created_at, hide_photo
            `, { count: 'exact' })
            .eq('is_blocked', false)
            .eq('profile_visibility', 'public')
            .neq('id', req.userId)
            .not('is_managed', 'is', true);

        if (targetGender) query = query.ilike('gender', `${targetGender}%`);

        // --- Apply Preferences ---

        // Age Preference
        if (user.preferred_age_from) {
            const maxDob = new Date();
            maxDob.setFullYear(maxDob.getFullYear() - parseInt(user.preferred_age_from));
            query = query.lte('date_of_birth', maxDob.toISOString().split('T')[0]);
        }
        if (user.preferred_age_to) {
            const minDob = new Date();
            minDob.setFullYear(minDob.getFullYear() - parseInt(user.preferred_age_to));
            query = query.gte('date_of_birth', minDob.toISOString().split('T')[0]);
        }

        // Marital Status
        if (user.preferred_marital_status && user.preferred_marital_status !== 'any-status') {
             // Handle some common values from register.html
             let msValue = user.preferred_marital_status;
             if (msValue === 'never-married') msValue = 'Never Married';
             query = query.ilike('marital_status', `%${msValue}%`);
        }

        // Caste Preference
        if (user.preferred_caste === 'same-caste' && user.caste) {
            query = query.ilike('caste', `%${user.caste}%`);
        } else if (user.preferred_caste && !['any-caste', 'specific'].includes(user.preferred_caste)) {
            query = query.ilike('caste', `%${user.preferred_caste}%`);
        }

        // Mother Tongue
        if (user.preferred_mother_tongue === 'same-language' && user.mother_tongue) {
            query = query.ilike('mother_tongue', `%${user.mother_tongue}%`);
        } else if (user.preferred_mother_tongue && user.preferred_mother_tongue !== 'any-language') {
            query = query.ilike('mother_tongue', `%${user.preferred_mother_tongue}%`);
        }

        // Location
        if (user.preferred_location === 'same-city' && user.city) {
            query = query.ilike('city', `%${user.city}%`);
        } else if (user.preferred_location === 'same-state' && user.state) {
            query = query.ilike('state', `%${user.state}%`);
        }

        // Religion
        if (user.religion) { // Usually matches same religion by default
            query = query.ilike('religion', `%${user.religion}%`);
        }

        // Execute with limit
        const { data, error, count } = await withTimeout(
            query.limit(40).order('created_at', { ascending: false }),
            TIMEOUT_MS.QUERY,
            'getRecommended'
        );

        if (error) throw error;

        // Add age to each profile
        // Add age and score to each profile
        const profiles = (data || []).map(p => {
            const ageComp = p.date_of_birth
                ? Math.floor((Date.now() - new Date(p.date_of_birth)) / 31557600000)
                : null;
            
            return {
                ...p,
                age: ageComp,
                match_percentage: calculateMatchScore(user, p)
            };
        });

        res.json({
            profiles,
            total: count,
            source: 'preferences'
        });

    } catch (err) {
        console.error('Recommended error:', err.message);
        res.status(500).json({ error: 'Failed to fetch recommendations' });
    }
});

// ══════════════════════════════════════════════════════════════
// PREFERRED MATCHES — GET /api/matches/preferred
// Strictly filters matches based on the logged-in user's partner preferences
// ══════════════════════════════════════════════════════════════
router.get('/preferred', requireAuth, async (req, res) => {
    try {
        // 1. Fetch current user's preferences
        const { data: user, error: userErr } = await withTimeout(
            supabaseAdmin
                .from('profiles')
                .select('*')
                .eq('id', req.userId)
                .single(),
            TIMEOUT_MS.QUERY,
            'getPreferences'
        );

        if (userErr || !user) {
            return res.status(404).json({ error: 'User profile not found' });
        }

        // Verify if user actually has set any partner preferences
        const hasPreferences = [
            user.preferred_age_from,
            user.preferred_age_to,
            user.preferred_height_from,
            user.preferred_height_to,
            user.preferred_marital_status,
            user.preferred_location,
            user.preferred_caste,
            user.preferred_mother_tongue,
            user.preferred_education,
            user.preferred_profession,
            user.preferred_diet,
            user.preferred_family_type,
            user.preferred_rasi
        ].some(val => {
            if (val === null || val === undefined) return false;
            const s = val.toString().trim().toLowerCase();
            return s !== '' && !['any', 'any-status', 'any-caste', 'any-language', 'any-education', 'any-location'].includes(s);
        });

        if (!hasPreferences) {
            return res.json({
                profiles: [],
                total: 0,
                has_preferences: false,
                source: 'preferred_tab'
            });
        }

        // 2. Determine target gender
        let targetGender = null;
        if (user && user.gender) {
            const g = user.gender.toLowerCase();
            if (g === 'male' || (g.includes('male') && !g.includes('female'))) targetGender = 'Female';
            else if (g === 'female' || g.includes('female')) targetGender = 'Male';
        }

        // 3. Query all public, active, opposite-gender profiles
        let query = supabaseAdmin
            .from('profiles')
            .select(`
                id, member_id, full_name, gender, date_of_birth,
                height, body_type, skin_colour, marital_status,
                religion, caste, mother_tongue,
                education, employment_status, annual_income, job_roles,
                city, state, native_place,
                rasi, star, family_type,
                profile_picture_url, profile_status, plan_name,
                about_myself, created_at, hide_photo
            `)
            .eq('is_blocked', false)
            .eq('profile_visibility', 'public')
            .neq('id', req.userId)
            .not('is_managed', 'is', true);

        if (targetGender) query = query.ilike('gender', `${targetGender}%`);

        const { data, error } = await withTimeout(
            query.limit(200),
            TIMEOUT_MS.QUERY,
            'getPreferredBase'
        );

        if (error) throw error;

        // Helper: helper function to check if target matches preference
        const matchesPref = (val, pref) => {
            if (!pref || pref === 'any' || pref === 'any-status' || pref === 'any-caste' || pref === 'any-language' || pref === 'any-education' || pref === 'any-location') return true;
            if (!val) return false;
            return val.toString().toLowerCase().includes(pref.toString().toLowerCase());
        };

        const profiles = (data || []).filter(p => {
            // Age filter
            if (user.preferred_age_from || user.preferred_age_to) {
                if (!p.date_of_birth) return false;
                const age = Math.floor((Date.now() - new Date(p.date_of_birth)) / 31557600000);
                if (user.preferred_age_from && age < parseInt(user.preferred_age_from)) return false;
                if (user.preferred_age_to && age > parseInt(user.preferred_age_to)) return false;
            }

            // Height filter
            if (user.preferred_height_from || user.preferred_height_to) {
                const heightVal = p.height || p.height_custom;
                if (!heightVal) return false;
                const hNum = parseInt(heightVal.toString().replace(/[^\d]/g, ''));
                if (!isNaN(hNum)) {
                    if (user.preferred_height_from && hNum < parseInt(user.preferred_height_from)) return false;
                    if (user.preferred_height_to && hNum > parseInt(user.preferred_height_to)) return false;
                }
            }

            // Marital status
            if (user.preferred_marital_status) {
                let msVal = user.preferred_marital_status;
                if (msVal === 'never-married') msVal = 'Never Married';
                else if (msVal === 'divorced') msVal = 'Divorce';
                else if (msVal === 'widowed') msVal = 'Widow/Widower';
                if (!matchesPref(p.marital_status, msVal)) return false;
            }

            // Caste
            if (user.preferred_caste) {
                const castVal = user.preferred_caste === 'same-caste' ? user.caste : user.preferred_caste;
                if (!matchesPref(p.caste, castVal)) return false;
            }

            // Mother tongue
            if (user.preferred_mother_tongue) {
                const langVal = user.preferred_mother_tongue === 'same-language' ? user.mother_tongue : user.preferred_mother_tongue;
                if (!matchesPref(p.mother_tongue, langVal)) return false;
            }

            // Location
            if (user.preferred_location) {
                if (user.preferred_location === 'same-city') {
                    if (!matchesPref(p.city, user.city)) return false;
                } else if (user.preferred_location === 'same-state') {
                    if (!matchesPref(p.state, user.state)) return false;
                } else if (user.preferred_location === 'south-india') {
                    const southStates = ['Tamil Nadu', 'Kerala', 'Karnataka', 'Andhra Pradesh', 'Telangana', 'Puducherry'];
                    if (!p.state || !southStates.some(s => p.state.toLowerCase().includes(s.toLowerCase()))) return false;
                } else if (user.preferred_location === 'north-india') {
                    const southStates = ['Tamil Nadu', 'Kerala', 'Karnataka', 'Andhra Pradesh', 'Telangana', 'Puducherry'];
                    if (!p.state || southStates.some(s => p.state.toLowerCase().includes(s.toLowerCase()))) return false;
                }
            }

            // Education
            if (!matchesPref(p.education, user.preferred_education)) return false;

            // Profession/Occupation
            if (!matchesPref(p.job_roles || p.occupation, user.preferred_profession)) return false;

            // Diet
            if (user.preferred_diet && user.preferred_diet !== 'any') {
                if (!matchesPref(p.eating_habits, user.preferred_diet)) return false;
            }

            // Family type
            if (!matchesPref(p.family_type, user.preferred_family_type)) return false;

            // Rasi
            if (!matchesPref(p.rasi, user.preferred_rasi)) return false;

            return true;
        }).map(p => {
            const ageComp = p.date_of_birth
                ? Math.floor((Date.now() - new Date(p.date_of_birth)) / 31557600000)
                : null;
            return {
                ...p,
                age: ageComp,
                match_percentage: calculateMatchScore(user, p)
            };
        });

        res.json({
            profiles,
            total: profiles.length,
            has_preferences: true,
            source: 'preferred_tab'
        });

    } catch (err) {
        console.error('Preferred matches error:', err.message);
        res.status(500).json({ error: 'Failed to fetch preferred matches' });
    }
});

// ══════════════════════════════════════════════════════════════
// ALL ACTIVE MATCHES — GET /api/matches (REFINED)
// ══════════════════════════════════════════════════════════════
router.get('/', requireAuth, async (req, res) => {
    try {
        const {
            gender, religion, caste, state, city,
            age_from, age_to, education, marital_status,
            mother_tongue, body_type, skin_colour,
            employment_status, family_type, star, rasi,
            lagnam, occupation, income, member_id,
            vip_only, premium_only,
            page = 1, limit = 20
        } = req.query;
        
        // --- Automatic Gender Filtering ---
        // Fetch current user if gender not provided in query
        let targetGender = gender;
        if (!targetGender) {
            const { data: currentUser } = await supabaseAdmin
                .from('profiles')
                .select('gender')
                .eq('id', req.userId)
                .single();
            
            if (currentUser && currentUser.gender) {
                const g = currentUser.gender.toLowerCase();
                if (g === 'male' || (g.includes('male') && !g.includes('female'))) targetGender = 'Female';
                else if (g === 'female' || g.includes('female')) targetGender = 'Male';
            }
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = supabaseAdmin
            .from('profiles')
            .select(`
                id, member_id, full_name, gender, date_of_birth,
                height, body_type, skin_colour, marital_status,
                religion, caste, mother_tongue,
                education, employment_status, annual_income, job_roles,
                city, state, native_place,
                rasi, star, family_type,
                profile_picture_url, profile_status, plan_name,
                about_myself, created_at, hide_photo
            `, { count: 'exact' })
            .eq('is_blocked', false)
            .eq('profile_visibility', 'public')
            .neq('id', req.userId)        // exclude self
            .not('is_managed', 'is', true)
            .range(offset, offset + parseInt(limit) - 1)
            .order('created_at', { ascending: false });

        // Apply filters
        if (targetGender) query = query.ilike('gender', `${targetGender}%`);
        if (religion && religion !== 'any') query = query.ilike('religion', `%${religion}%`);
        if (caste && caste !== 'any') query = query.ilike('caste', `%${caste}%`);
        if (state && state !== 'any') query = query.ilike('state', `%${state}%`);
        if (city && city !== 'any') query = query.ilike('city', `%${city}%`);
        if (marital_status && marital_status !== 'any') {
            if (marital_status === 'first-marriage' || marital_status === 'never-married') {
                query = query.ilike('marital_status', '%never married%');
            } else {
                query = query.ilike('marital_status', `%${marital_status}%`);
            }
        }
        if (education && education !== 'any') query = query.ilike('education', `%${education}%`);
        if (mother_tongue && mother_tongue !== 'any') query = query.ilike('mother_tongue', `%${mother_tongue}%`);
        if (body_type && body_type !== 'any') query = query.eq('body_type', body_type);
        if (skin_colour && skin_colour !== 'any') query = query.eq('skin_colour', skin_colour);
        if (employment_status && employment_status !== 'any') query = query.eq('employment_status', employment_status);
        if (family_type && family_type !== 'any') query = query.eq('family_type', family_type);
        if (star && star !== 'any') query = query.ilike('star', `%${star}%`);
        if (rasi && rasi !== 'any') query = query.ilike('rasi', `%${rasi}%`);
        if (lagnam && lagnam !== 'any') query = query.ilike('lagnam', `%${lagnam}%`);
        if (occupation && occupation !== 'any') query = query.ilike('job_roles', `%${occupation}%`);
        if (income && income !== 'any') query = query.ilike('annual_income', `%${income}%`);
        if (member_id) query = query.ilike('member_id', `%${member_id.trim()}%`);

        if (vip_only === 'true') {
            query = query.eq('plan_name', 'vip');
        } else if (premium_only === 'true') {
            query = query.in('plan_name', ['vip', 'diamond', 'gold', 'silver']);
        }

        // Age filter — dob between age_to years ago and age_from years ago
        if (age_from) {
            const maxDob = new Date();
            maxDob.setFullYear(maxDob.getFullYear() - parseInt(age_from));
            query = query.lte('date_of_birth', maxDob.toISOString().split('T')[0]);
        }
        if (age_to) {
            const minDob = new Date();
            minDob.setFullYear(minDob.getFullYear() - parseInt(age_to));
            query = query.gte('date_of_birth', minDob.toISOString().split('T')[0]);
        }

        const { data, error, count } = await withTimeout(
            query,
            TIMEOUT_MS.QUERY,
            'getMatches'
        );
        if (error) throw error;

        // 4. Fetch own profile for scoring
        const { data: user } = await supabaseAdmin.from('profiles').select('*').eq('id', req.userId).single();

        // Offline matches disabled per user request (do not show uploaded profiles in matches page)
        const normalizedOffline = [];
        const filteredOffline = [];

        // Add age and score to regular profiles
        const regularProfiles = (data || []).map(p => {
            const ageComp = p.date_of_birth
                ? Math.floor((Date.now() - new Date(p.date_of_birth)) / 31557600000)
                : null;
            
            return {
                ...p,
                age: ageComp,
                match_percentage: user ? calculateMatchScore(user, p) : 0
            };
        });

        // Combine both sets — offline members first
        const combinedProfiles = [...normalizedOffline, ...regularProfiles].slice(0, limit);

        res.json({
            profiles: combinedProfiles,
            pagination: {
                total: (count || 0) + filteredOffline.length,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(((count || 0) + filteredOffline.length) / parseInt(limit))
            }
        });

    } catch (err) {
        console.error('Matches error:', err.message);
        res.status(500).json({ error: 'Failed to fetch matches' });
    }
});

// ══════════════════════════════════════════════════════════════
// ADVANCED SEARCH — GET /api/matches/search
// Same as above but also searches full_name
// ══════════════════════════════════════════════════════════════
router.get('/search', requireAuth, async (req, res) => {
    try {
        const { q, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        if (!q || q.trim().length < 2) {
            return res.status(400).json({ error: 'Search query must be at least 2 characters' });
        }

        const { data, error, count } = await withTimeout(
            supabaseAdmin
                .from('profiles')
                .select('id, member_id, full_name, gender, date_of_birth, city, state, religion, caste, education, job_roles, profile_picture_url, plan_name, hide_photo', { count: 'exact' })
                .eq('is_blocked', false)
                .eq('profile_visibility', 'public')
                .neq('id', req.userId)
                .not('is_managed', 'is', true)
                .or(`full_name.ilike.%${q}%,city.ilike.%${q}%,religion.ilike.%${q}%,caste.ilike.%${q}%,job_roles.ilike.%${q}%`)
                .range(offset, offset + parseInt(limit) - 1),
            TIMEOUT_MS.QUERY,
            'searchMatches'
        );

        if (error) throw error;

        res.json({
            profiles: data || [],
            query: q,
            pagination: { total: count || 0, page: parseInt(page), limit: parseInt(limit) }
        });

    } catch (err) {
        console.error('Search error:', err.message);
        res.status(500).json({ error: 'Search failed' });
    }
});

module.exports = router;
