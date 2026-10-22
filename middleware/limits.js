const fs = require('fs');
const path = require('path');

const LIMITS_FILE = path.join(__dirname, '..', 'limits_ledger.json');

// Standard memory limits cache
let limitsCache = {};
if (fs.existsSync(LIMITS_FILE)) {
    try { limitsCache = JSON.parse(fs.readFileSync(LIMITS_FILE, 'utf8')); } catch(e) {}
}

// Persist limits async
function flush() {
    fs.writeFile(LIMITS_FILE, JSON.stringify(limitsCache, null, 2), err => {
        if(err) console.error("Error saving limits logic:", err);
    });
}

function getTracker(userId) {
    if (!limitsCache[userId]) {
        limitsCache[userId] = { 
            contact_views: 0, 
            daily_messages: 0, 
            last_message_date: new Date().toISOString().split('T')[0],
            unlocked_contacts: []
        };
    }
    if (!limitsCache[userId].unlocked_contacts) {
        limitsCache[userId].unlocked_contacts = [];
    }
    
    // Auto-reset daily messaging quota if date shifted
    const today = new Date().toISOString().split('T')[0];
    if (limitsCache[userId].last_message_date !== today) {
        limitsCache[userId].daily_messages = 0;
        limitsCache[userId].last_message_date = today;
    }
    return limitsCache[userId];
}

const { supabaseAdmin } = require('../lib/supabase');

// Numerical Plan Matrix
const PLAN_LIMITS = {
    free:    { contacts: 0,        msgPerDay: 0         },
    silver:  { contacts: 15,       msgPerDay: 15        }, // Silver plan: 15 contact views
    gold:    { contacts: 30,       msgPerDay: 10        }, // Gold plan: 30 contact views
    diamond: { contacts: 50,       msgPerDay: Infinity  }, // Diamond plan: 50 contact views
    vip:     { contacts: Infinity, msgPerDay: Infinity  }  // VIP: Unlimited
};

module.exports = {
    PLAN_LIMITS,

    // Get contact view stats for user (used, total, remaining, canView)
    getContactViewStats: async (userId, planName) => {
        const p = (planName || 'free').toLowerCase();
        const max = PLAN_LIMITS[p] ? PLAN_LIMITS[p].contacts : 0;
        if (max === Infinity) {
            return { used: 0, total: Infinity, remaining: Infinity, canView: true };
        }

        try {
            // Attempt to query contact_views from Supabase
            const { data, error } = await supabaseAdmin
                .from('contact_views')
                .select('viewed_id')
                .eq('viewer_id', userId);

            if (!error && data) {
                const uniqueViews = new Set(data.map(d => String(d.viewed_id))).size;
                const remaining = Math.max(0, max - uniqueViews);
                return {
                    used: uniqueViews,
                    total: max,
                    remaining,
                    canView: remaining > 0
                };
            }
        } catch (e) {
            console.warn('[Limits] contact_views table query failed, using ledger fallback:', e.message);
        }

        // Fallback to local ledger cache
        const tracker = getTracker(userId);
        const uniqueLocal = new Set(tracker.unlocked_contacts || []).size;
        const remaining = Math.max(0, max - uniqueLocal);
        return {
            used: uniqueLocal,
            total: max,
            remaining,
            canView: remaining > 0
        };
    },

    // Check if target member contact is already unlocked by viewer
    isContactUnlocked: async (viewerId, targetId) => {
        if (!viewerId || !targetId) return false;
        if (String(viewerId) === String(targetId)) return true;

        try {
            const { data, error } = await supabaseAdmin
                .from('contact_views')
                .select('id')
                .eq('viewer_id', viewerId)
                .eq('viewed_id', String(targetId))
                .maybeSingle();

            if (!error && data) return true;
        } catch (e) {}

        // Check fallback ledger cache
        const tracker = getTracker(viewerId);
        if (tracker.unlocked_contacts && tracker.unlocked_contacts.includes(String(targetId))) {
            return true;
        }
        return false;
    },

    // Record an unlock for target member
    recordContactUnlock: async (viewerId, targetId, viewedMemberId) => {
        if (!viewerId || !targetId) return false;
        const strTarget = String(targetId);

        // Always update ledger cache
        const tracker = getTracker(viewerId);
        if (!tracker.unlocked_contacts) tracker.unlocked_contacts = [];
        if (!tracker.unlocked_contacts.includes(strTarget)) {
            tracker.unlocked_contacts.push(strTarget);
            flush();
        }

        // Try inserting/upserting into Supabase contact_views table
        try {
            const { error } = await supabaseAdmin
                .from('contact_views')
                .upsert({
                    viewer_id: viewerId,
                    viewed_id: strTarget
                }, { onConflict: 'viewer_id,viewed_id', ignoreDuplicates: true });

            if (error) {
                console.warn('[Limits] Failed to insert contact_views into DB:', error.message);
            }
            return true;
        } catch (e) {
            console.warn('[Limits] Failed to insert contact_views into DB:', e.message);
            return true; // Ledger succeeded
        }
    },

    // Legacy support
    canViewContact: async (userId, planName) => {
        const p = (planName || 'free').toLowerCase();
        const max = PLAN_LIMITS[p] ? PLAN_LIMITS[p].contacts : 0;
        if (max === Infinity) return true;
        const stats = await module.exports.getContactViewStats(userId, planName);
        return stats.canView;
    },
    recordContactView: (userId) => {
        // No-op
    },
    canSendMessage: (userId, planName) => {
        const p = (planName || 'free').toLowerCase();
        const max = PLAN_LIMITS[p] ? PLAN_LIMITS[p].msgPerDay : 0;
        if (max === Infinity) return true;

        const tracker = getTracker(userId);
        return tracker.daily_messages < max;
    },
    recordMessageSent: (userId) => {
        const tracker = getTracker(userId);
        tracker.daily_messages += 1;
        flush();
    }
};
