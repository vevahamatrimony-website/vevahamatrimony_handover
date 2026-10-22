const router = require('express').Router();
const { supabaseAdmin } = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');
const limits = require('../middleware/limits');

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
// GET UPLOADED PROFILES (Dashboard) — GET /api/profile/browse-uploaded
// ══════════════════════════════════════════════════════════════
router.get('/browse-uploaded', requireAuth, async (req, res) => {
    try {
        console.log('[API] Hit /api/profile/browse-uploaded - User:', req.userId);
        
        // 1. Get requester gender
        const { data: user } = await supabaseAdmin.from('profiles').select('gender').eq('id', req.userId).single();
        let targetGender = null;
        if (user && user.gender) {
            const g = user.gender.toLowerCase();
            if (g === 'male' || (g.includes('male') && !g.includes('female'))) targetGender = 'Female';
            else if (g === 'female' || g.includes('female')) targetGender = 'Male';
        }

        // 2. Query for uploaded profiles of opposite gender
        // is_managed=true indicates admin-curated profiles
        let query = supabaseAdmin
            .from('profiles')
            .select(`
                id, member_id, full_name, gender,
                date_of_birth, city, state,
                education, job_roles, caste,
                plan_name, profile_picture_url, about_myself, last_seen, hide_photo
            `)
            .eq('is_blocked', false)
            .eq('is_managed', true)
            .neq('id', req.userId);

        if (targetGender) {
            // Flexible matching but avoid matching "Female" when searching for "Male"
            query = query.ilike('gender', `${targetGender}%`);
        }

        const { data, error } = await withTimeout(
            query.limit(200).order('created_at', { ascending: false }),
            TIMEOUT_MS.QUERY,
            'getUploadedProfiles'
        );

        if (error) throw error;

        // 3. Fetch from offline_members as well
        let offlineQuery = supabaseAdmin
            .from('offline_members')
            .select('*')
            .eq('status', 'active');
        
        if (targetGender) {
            offlineQuery = offlineQuery.ilike('gender', `${targetGender}%`);
        }

        const { data: offlineData } = await withTimeout(
            offlineQuery.limit(100),
            TIMEOUT_MS.QUERY,
            'getOfflineProfiles'
        );

        // Normalize offline members (include phone and whatsapp contact details)
        const normalizedOffline = (offlineData || []).map(o => ({
            id: `offline_${o.member_id}`,
            member_id: o.member_id,
            full_name: o.full_name,
            gender: o.gender,
            date_of_birth: o.dob,
            city: o.city || o.birth_place,
            education: o.education,
            job_roles: o.job,
            caste: o.caste,
            profile_picture_url: o.profile_picture_url,
            is_managed: true,
            managed: true,
            phone: o.phone,
            whatsapp: o.whatsapp
        }));

        const profiles = (data || []).map(p => {
            let age = null;
            if (p.date_of_birth) {
                age = Math.floor((Date.now() - new Date(p.date_of_birth)) / (365.25 * 24 * 3600 * 1000));
            }
            return {
                ...p,
                age,
                phone: p.mobile_number,
                whatsapp: p.mobile_number
            };
        });

        // Combine both offline_members and is_managed profiles
        const combined = [...normalizedOffline, ...profiles];

        res.json({ profiles: combined, total: combined.length });
    } catch (err) {
        console.error('Browse uploaded error:', err.message);
        res.status(500).json({ error: 'Failed' });
    }
});

// ══════════════════════════════════════════════════════════════
// PUBLIC PROFILES — GET /api/profile/public
// ══════════════════════════════════════════════════════════════
router.get('/public', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 200, 200);

        // 1. Fetch from profiles table
        const { data: dbProfiles, error } = await withTimeout(
            supabaseAdmin
                .from('profiles')
                .select(`
                    id, member_id, full_name, gender,
                    date_of_birth, city, state,
                    education, job_roles, caste,
                    plan_name, profile_picture_url, about_myself, last_seen, hide_photo
                `)
                .eq('is_blocked', false)
                .not('full_name', 'is', null)
                .limit(limit)
                .order('created_at', { ascending: false }),
            TIMEOUT_MS.QUERY,
            'getPublicProfiles'
        );

        if (error) throw error;

        let profiles = (dbProfiles || []).map(p => {
            let age = null;
            if (p.date_of_birth) {
                age = Math.floor((Date.now() - new Date(p.date_of_birth)) / (365.25 * 24 * 3600 * 1000));
            }
            return {
                id: p.id,
                member_id: p.member_id,
                full_name: p.full_name || 'Member',
                gender: p.gender,
                age,
                city: p.city,
                state: p.state,
                education: p.education,
                job_roles: p.job_roles,
                caste: p.caste,
                plan_name: p.plan_name || 'free',
                profile_picture_url: p.profile_picture_url,
                about_myself: p.about_myself,
                is_online: p.last_seen ? (Date.now() - new Date(p.last_seen).getTime() < 5 * 60 * 1000) : false,
                hide_photo: p.hide_photo || false
            };
        });

        // 2. If count is small, fetch active offline_members as well
        if (profiles.length < limit) {
            const { data: offlineData } = await withTimeout(
                supabaseAdmin
                    .from('offline_members')
                    .select('*')
                    .eq('status', 'active')
                    .limit(limit - profiles.length),
                TIMEOUT_MS.QUERY,
                'getPublicOfflineProfiles'
            );

            if (offlineData && offlineData.length > 0) {
                const normalizedOffline = offlineData.map(o => {
                    let age = null;
                    if (o.dob) {
                        age = Math.floor((Date.now() - new Date(o.dob)) / (365.25 * 24 * 3600 * 1000));
                    }
                    return {
                        id: `offline_${o.member_id}`,
                        member_id: o.member_id,
                        full_name: o.full_name,
                        gender: o.gender,
                        age,
                        city: o.city || o.birth_place,
                        state: o.district || '',
                        education: o.education,
                        job_roles: o.job,
                        caste: o.caste,
                        plan_name: 'gold',
                        profile_picture_url: o.profile_picture_url,
                        about_myself: '',
                        is_online: true,
                        hide_photo: false
                    };
                });
                profiles = [...profiles, ...normalizedOffline];
            }
        }

        res.json({ profiles, total: profiles.length });
    } catch (err) {
        console.error('Public profiles error:', err.message);
        res.status(500).json({ error: 'Failed to fetch profiles' });
    }
});

// ══════════════════════════════════════════════════════════════
// DASHBOARD STATS — GET /api/profile/stats
// IMPORTANT: Keep this BEFORE /:member_id
// ══════════════════════════════════════════════════════════════
router.get('/stats', requireAuth, async (req, res) => {
    try {
        const userId = req.userId;

        // 1. Unread Messages Count
        const { count: unreadMessages } = await withTimeout(
            supabaseAdmin
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('receiver_id', userId)
                .eq('is_read', false),
            TIMEOUT_MS.QUERY,
            'getUnreadCount'
        );

        // 2. Profile Views Count (This Month)
        const firstOfMonth = new Date();
        firstOfMonth.setDate(1);
        firstOfMonth.setHours(0, 0, 0, 0);

        let profileViews = 0;
        try {
            const { count } = await withTimeout(
                supabaseAdmin
                    .from('profile_views')
                    .select('*', { count: 'exact', head: true })
                    .eq('viewed_id', userId)
                    .gte('created_at', firstOfMonth.toISOString()),
                TIMEOUT_MS.QUERY,
                'getViewsCount'
            );
            profileViews = count || 0;
        } catch (e) {
            console.warn('[Stats] profile_views table might be missing');
        }

        // 3. New Matches Count (Opposite gender)
        const { data: user } = await supabaseAdmin.from('profiles').select('gender').eq('id', userId).single();
        let targetGender = null;
        if (user && user.gender) {
            const g = user.gender.toLowerCase();
            if (g.includes('male') && !g.includes('female')) targetGender = 'Female';
            else if (g.includes('female')) targetGender = 'Male';
        }

        let matchQuery = supabaseAdmin
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('is_blocked', false)
            .neq('id', userId);
        
        if (targetGender) matchQuery = matchQuery.ilike('gender', targetGender);
        
        const { count: matchesCount } = await withTimeout(
            matchQuery,
            TIMEOUT_MS.QUERY,
            'getMatchesCount'
        );

        res.json({
            profile_views: profileViews,
            new_matches: matchesCount || 0,
            unread_messages: unreadMessages || 0
        });
    } catch (err) {
        console.error('Stats fetch error:', err.message);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

// ══════════════════════════════════════════════════════════════
// GET OWN PROFILE — GET /api/profile/me
// ══════════════════════════════════════════════════════════════
router.get('/me', requireAuth, async (req, res) => {
    try {
        const { data, error } = await withTimeout(
            supabaseAdmin
                .from('profiles')
                .select('*')
                .eq('id', req.userId)
                .single(),
            TIMEOUT_MS.QUERY,
            'getOwnProfile'
        );

        if (error || !data) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        // Auto-downgrade expired
        if (data.plan_name && data.plan_name !== 'free' && data.plan_expiry_date) {
            if (new Date(data.plan_expiry_date) < new Date()) {
                data.plan_name = 'free';
                data.membership_status = 'expired';
                supabaseAdmin.from('profiles').update({ plan_name: 'free', membership_status: 'expired' }).eq('id', req.userId).then(()=>{});
            }
        }

        const completionFields = ['full_name', 'gender', 'date_of_birth', 'religion', 'caste', 'city', 'state', 'education', 'job_roles', 'annual_income', 'about_myself', 'profile_picture_url'];
        const filled = completionFields.filter(f => data[f]).length;
        data.profile_completion = Math.round((filled / completionFields.length) * 100);
        data.missing_fields = completionFields.filter(f => !data[f]).map(f => f.replace(/_/g, ' '));

        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.json({ profile: data });
    } catch (err) {
        console.error('Profile fetch error:', err.message);
        res.status(500).json({ error: 'Failed' });
    }
});

// ══════════════════════════════════════════════════════════════
// UPDATE OWN PROFILE — PUT /api/profile/me
// ══════════════════════════════════════════════════════════════
router.put('/me', requireAuth, async (req, res) => {
    try {
        const PROTECTED = ['id', 'member_id', 'email_address', 'plan_name', 'plan_expiry_date', 'is_verified', 'is_blocked', 'created_at'];
        const updates = { ...req.body };
        console.log('[PROFILE UPDATE] userId:', req.userId, '| city received:', req.body.city, '| keys:', Object.keys(updates).join(','));
        PROTECTED.forEach(f => delete updates[f]);

        // Convert string integer fields to actual integers or null
        const INT_FIELDS = ['preferred_age_from', 'preferred_age_to', 'number_of_children', 'number_of_brothers', 'number_of_sisters'];
        INT_FIELDS.forEach(f => {
            if (updates[f] !== undefined) {
                if (updates[f] === '' || updates[f] === null) {
                    updates[f] = null;
                } else {
                    const parsed = parseInt(updates[f], 10);
                    updates[f] = isNaN(parsed) ? null : parsed;
                }
            }
        });

        // Trim city if provided — city and place_of_birth are independent fields
        if (updates.city !== undefined) {
            updates.city = (updates.city || '').trim() || null;
        }

        // Convert empty string for typed fields to null
        if (updates.time_of_birth === '') updates.time_of_birth = null;
        if (updates.date_of_birth === '') updates.date_of_birth = null;
        if (updates.hide_photo === '') updates.hide_photo = null;
        if (updates.hide_horoscope === '') updates.hide_horoscope = null;

        const { data, error } = await withTimeout(
            supabaseAdmin.from('profiles').update(updates).eq('id', req.userId).select().single(),
            TIMEOUT_MS.QUERY,
            'updateProfile'
        );

        if (error) throw error;
        console.log('[PROFILE UPDATE] Saved city:', data && data.city);
        res.json({ message: 'Profile updated', profile: data });
    } catch (err) {
        console.error('Profile update error:', err.message);
        res.status(500).json({ error: err.message || 'Failed' });
    }
});

// ══════════════════════════════════════════════════════════════
// GET MATCHES — GET /api/profile/matches
// ══════════════════════════════════════════════════════════════
router.get('/matches', requireAuth, async (req, res) => {
    try {
        const { data: user } = await supabaseAdmin.from('profiles').select('gender').eq('id', req.userId).single();
        let targetGender = null;
        if (user && user.gender) {
            const g = user.gender.toLowerCase();
            if (g.includes('male') && !g.includes('female')) targetGender = 'Female';
            else if (g.includes('female')) targetGender = 'Male';
        }

        let query = supabaseAdmin.from('profiles').select('*').eq('is_blocked', false).neq('id', req.userId);
        if (targetGender) query = query.ilike('gender', targetGender);

        const { data, error } = await withTimeout(query.limit(50), TIMEOUT_MS.QUERY, 'getMatches');
        if (error) throw error;

        const profiles = (data || []).map(p => {
            let age = null;
            if (p.date_of_birth) age = Math.floor((Date.now() - new Date(p.date_of_birth)) / (365.25 * 24 * 3600 * 1000));
            return { ...p, age };
        });

        res.json({ profiles, total: profiles.length });
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

// ═════════════════════════════════════════════════
// Route moved to top
// ═════════════════════════════════════════════════


// ══════════════════════════════════════════════════════════════
// GET CONTACT INFO — GET /api/profile/get-contact/:member_id
// ══════════════════════════════════════════════════════════════
router.get(['/get-contact/:member_id', '/:member_id/contact'], requireAuth, async (req, res) => {
    try {
        const { member_id } = req.params;
        if (!member_id) return res.status(400).json({ success: false, message: 'Member ID required' });

        // 1. Fetch profile from profiles table first
        let { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('id, member_id, full_name, mobile_number, email_address, is_managed')
            .eq('member_id', member_id)
            .maybeSingle();

        let isOffline = false;
        let offlineData = null;

        if (!profile) {
            // Check offline_members
            const { data: offlineTemp } = await supabaseAdmin
                .from('offline_members')
                .select('id, member_id, full_name, phone, whatsapp, status')
                .eq('member_id', member_id)
                .maybeSingle();

            if (offlineTemp) {
                offlineData = offlineTemp;
                profile = {
                    id: `offline_${offlineData.member_id}`,
                    member_id: offlineData.member_id,
                    full_name: offlineData.full_name,
                    mobile_number: offlineData.phone || offlineData.whatsapp,
                    email_address: null,
                    is_managed: true
                };
                isOffline = true;
            }
        }

        if (!profile) {
            return res.status(404).json({ success: false, message: 'Profile not found' });
        }

        const targetId = profile.id;
        const isSelf = req.userId === targetId;
        const isUnlocked = await limits.isContactUnlocked(req.userId, targetId);

        // Fetch viewer's plan & stats
        const { data: viewer } = await supabaseAdmin
            .from('profiles')
            .select('plan_name')
            .eq('id', req.userId)
            .single();
        const planName = (viewer?.plan_name || 'free').toLowerCase();
        const stats = await limits.getContactViewStats(req.userId, planName);

        if (isSelf || isUnlocked) {
            const rawPhone = profile.mobile_number || (offlineData ? (offlineData.phone || offlineData.whatsapp) : '');
            return res.json({ 
                success: true, 
                is_unlocked: true,
                phone: rawPhone, 
                mobile_number: rawPhone,
                email_address: profile.email_address || 'Not Specified',
                contacts_remaining: stats.remaining,
                contacts_total: stats.total
            });
        } else {
            return res.json({
                success: false,
                is_unlocked: false,
                message: 'Contact details are locked. Click View Contact Details to unlock.',
                contacts_remaining: stats.remaining,
                contacts_total: stats.total,
                plan_name: planName
            });
        }
    } catch (err) {
        console.error('get-contact error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to retrieve contact' });
    }
});

// ══════════════════════════════════════════════════════════════
// UNLOCK CONTACT DETAILS — POST /api/profile/unlock-contact
// ══════════════════════════════════════════════════════════════
router.post('/unlock-contact', requireAuth, async (req, res) => {
    try {
        const { member_id } = req.body;
        if (!member_id) return res.status(400).json({ error: 'Member ID required' });

        // 1. Fetch viewer profile (plan & gender)
        const { data: viewer } = await supabaseAdmin
            .from('profiles')
            .select('id, plan_name, gender')
            .eq('id', req.userId)
            .single();

        if (!viewer) return res.status(404).json({ error: 'User profile not found' });
        const planName = (viewer.plan_name || 'free').toLowerCase();

        // 2. Fetch target profile
        let { data: targetProfile } = await supabaseAdmin
            .from('profiles')
            .select('id, member_id, full_name, mobile_number, email_address')
            .eq('member_id', member_id)
            .maybeSingle();

        let isOffline = false;
        let offlineData = null;

        if (!targetProfile) {
            const { data: offlineTemp } = await supabaseAdmin
                .from('offline_members')
                .select('id, member_id, full_name, phone, whatsapp')
                .eq('member_id', member_id)
                .maybeSingle();

            if (offlineTemp) {
                offlineData = offlineTemp;
                targetProfile = {
                    id: `offline_${offlineData.member_id}`,
                    member_id: offlineData.member_id,
                    full_name: offlineData.full_name,
                    mobile_number: offlineData.phone || offlineData.whatsapp,
                    email_address: null
                };
                isOffline = true;
            }
        }

        if (!targetProfile) {
            return res.status(404).json({ error: 'Target profile not found' });
        }

        const targetId = targetProfile.id;
        const rawPhone = targetProfile.mobile_number || (offlineData ? (offlineData.phone || offlineData.whatsapp) : '');
        const email = targetProfile.email_address || 'Not Specified';

        // If self, return immediately
        if (req.userId === targetId) {
            return res.json({
                success: true,
                already_unlocked: true,
                phone: rawPhone,
                mobile_number: rawPhone,
                email_address: email
            });
        }

        // Check if already unlocked previously
        const alreadyUnlocked = await limits.isContactUnlocked(req.userId, targetId);
        const currentStats = await limits.getContactViewStats(req.userId, planName);

        if (alreadyUnlocked) {
            return res.json({
                success: true,
                already_unlocked: true,
                phone: rawPhone,
                mobile_number: rawPhone,
                email_address: email,
                contacts_remaining: currentStats.remaining,
                contacts_total: currentStats.total
            });
        }

        // Check plan quota: Free tier accounts cannot view contact details
        if (planName === 'free') {
            return res.status(403).json({
                error: 'UPGRADE_REQUIRED',
                message: 'Viewing contact details requires an active membership plan (Silver, Gold, Diamond, or VIP). Please upgrade your plan to unlock verified contacts.'
            });
        }

        // Check if quota available
        if (!currentStats.canView || currentStats.remaining <= 0) {
            return res.status(403).json({
                error: 'LIMIT_EXCEEDED',
                message: `You have reached your contact view limit of ${currentStats.total} contacts for your ${planName.toUpperCase()} plan. Please upgrade to view more contacts.`,
                contacts_remaining: 0,
                contacts_total: currentStats.total
            });
        }

        // Record the contact unlock
        await limits.recordContactUnlock(req.userId, targetId, member_id);

        // Fetch updated remaining count
        const updatedStats = await limits.getContactViewStats(req.userId, planName);

        return res.json({
            success: true,
            message: 'Contact unlocked successfully',
            phone: rawPhone,
            mobile_number: rawPhone,
            email_address: email,
            contacts_remaining: updatedStats.remaining,
            contacts_total: updatedStats.total
        });

    } catch (err) {
        console.error('unlock-contact error:', err);
        res.status(500).json({ error: 'Failed to unlock contact' });
    }
});

// ══════════════════════════════════════════════════════════════
// GET PROFILE BY MEMBER_ID — GET /api/profile/:member_id
// (Unlimited full profile viewing for all members)
// ══════════════════════════════════════════════════════════════
router.get('/:member_id', requireAuth, async (req, res) => {
    try {
        let { member_id } = req.params;
        let cleanId = String(member_id || '').trim();
        let isOfflineReq = cleanId.startsWith('offline_');
        if (isOfflineReq) {
            cleanId = cleanId.replace(/^offline_/, '');
        }

        let data = null;
        let error = null;

        if (!isOfflineReq) {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
            const query = supabaseAdmin.from('profiles').select('*').eq('is_blocked', false);
            if (isUuid) {
                const res = await withTimeout(query.eq('id', cleanId).maybeSingle(), TIMEOUT_MS.QUERY, 'getProfileById');
                data = res.data;
                error = res.error;
            } else {
                const res = await withTimeout(query.eq('member_id', cleanId).maybeSingle(), TIMEOUT_MS.QUERY, 'getProfileByMemberId');
                data = res.data;
                error = res.error;
            }
        }

        let finalProfile = null;
        let targetId = null;
        let isOffline = false;
        let offlineData = null;

        if (error || !data) {
            // Check offline_members
            const { data: offlineTemp, error: offlineError } = await withTimeout(
                supabaseAdmin.from('offline_members').select('*').eq('member_id', cleanId).maybeSingle(),
                TIMEOUT_MS.QUERY,
                'getOfflineProfileByMemberId'
            );

            if (offlineError || !offlineTemp) {
                return res.status(404).json({ error: 'Profile not found' });
            }

            offlineData = offlineTemp;
            targetId = `offline_${offlineData.member_id}`;
            isOffline = true;

            // Map offlineData to standard profile schema for frontend
            finalProfile = {
                id: targetId,
                member_id: offlineData.member_id,
                full_name: offlineData.full_name,
                gender: offlineData.gender,
                date_of_birth: offlineData.dob,
                time_of_birth: offlineData.birth_time,
                place_of_birth: offlineData.birth_place,
                city: offlineData.birth_place || '',
                state: '',
                age: offlineData.age,
                height: offlineData.height,
                education: offlineData.education,
                occupation: offlineData.job,
                annual_income: offlineData.monthly_income,
                father_name: offlineData.father,
                mother_name: offlineData.mother,
                brothers_occupation_notes: offlineData.siblings,
                family_income: offlineData.property_details,
                caste: offlineData.caste,
                religion: 'Hindu',
                gotra: offlineData.gotra,
                rasi: offlineData.rasi,
                star: offlineData.star,
                profile_picture_url: offlineData.profile_picture_url,
                horoscope_file_path: offlineData.jathagam_url,
                about_myself: offlineData.expectations ? `Partner Expectations: ${offlineData.expectations}` : '',
                is_managed: true,
                is_verified: true,
                plan_name: 'Premium Uploaded'
            };
        } else {
            finalProfile = data;
            targetId = finalProfile.id;
        }

        // Fetch viewer's plan and stats
        const { data: viewer } = await supabaseAdmin
            .from('profiles')
            .select('plan_name, gender')
            .eq('id', req.userId)
            .single();
        const viewerPlan = (viewer?.plan_name || 'free').toLowerCase();
        const stats = await limits.getContactViewStats(req.userId, viewerPlan);

        // Check if contact is unlocked for this viewer or is self
        const isSelf = req.userId === targetId;
        const isUnlocked = await limits.isContactUnlocked(req.userId, targetId);

        if (isSelf || isUnlocked) {
            // Authorized view - populate unmasked contact details
            if (isOffline && offlineData) {
                finalProfile.mobile_number = offlineData.phone || offlineData.whatsapp || 'Not Specified';
                finalProfile.email_address = 'Not Specified';
            }
            finalProfile.is_contact_unlocked = true;
        } else {
            // Protected view - mask contact details
            finalProfile.mobile_number = null;
            finalProfile.email_address = null;
            finalProfile.is_contact_unlocked = false;
        }

        // Record profile visit for dashboard stats (who viewed my profile metric)
        if (req.userId !== finalProfile.id && !finalProfile.id.toString().startsWith('offline_')) {
            supabaseAdmin.from('profile_views').insert({ viewer_id: req.userId, viewed_id: finalProfile.id }).then(()=>{});
        }

        res.json({ 
            profile: finalProfile,
            contact_stats: {
                remaining: stats.remaining,
                total: stats.total,
                used: stats.used,
                can_unlock: stats.canView && stats.remaining > 0,
                plan_name: viewerPlan
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

// ══════════════════════════════════════════════════════════════
// DELETE ACCOUNT
// ══════════════════════════════════════════════════════════════
router.delete('/me', requireAuth, async (req, res) => {
    try {
        await supabaseAdmin.auth.admin.deleteUser(req.userId);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

// ══════════════════════════════════════════════════════════════
// PRESENCE & STATUS
// ══════════════════════════════════════════════════════════════
router.post('/presence', requireAuth, async (req, res) => {
    try {
        await supabaseAdmin.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', req.userId);
        res.json({ ok: true });
    } catch (err) { res.json({ ok: false }); }
});

router.post('/set-online-status', requireAuth, async (req, res) => {
    try {
        const { is_online } = req.body;
        await supabaseAdmin.from('profiles').update({ is_manually_online: is_online, last_seen: new Date().toISOString() }).eq('id', req.userId);
        res.json({ ok: true, is_online });
    } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
