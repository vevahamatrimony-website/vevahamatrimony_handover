const fs = require('fs');

const pPath = 'd:/vevahamatrimony-website/routes/profile.js';
let pText = fs.readFileSync(pPath, 'utf8');

const importLimits = `
const limits = require('../middleware/limits');
`;
if (!pText.includes("require('../middleware/limits')")) {
    pText = pText.replace("const { requireAuth } = require('../middleware/auth');", "const { requireAuth } = require('../middleware/auth');" + importLimits);
}

const checkProfileLogic = `
        const { member_id } = req.params;

        // Fetch requester's plan first to check limits
        const { data: requester } = await supabaseAdmin.from('profiles').select('plan_name').eq('id', req.userId).single();
        const planName = requester ? requester.plan_name : 'free';

        if (!limits.canViewContact(req.userId, planName)) {
            return res.status(403).json({ 
                error: 'Limit Reached', 
                message: 'You have exhausted your contact profile views for your current plan. Please upgrade to view more profiles.' 
            });
        }
`;

if (!pText.includes('limits.canViewContact')) {
    pText = pText.replace("const { member_id } = req.params;", checkProfileLogic);
}

const recordProfileLogic = `
        // Record the view after successful fetch
        limits.recordContactView(req.userId);

        // Hide contact info unless requester has accepted request with this profile
`;

if (!pText.includes('limits.recordContactView')) {
    pText = pText.replace("// Hide contact info unless requester has accepted request with this profile", recordProfileLogic);
}

fs.writeFileSync(pPath, pText);
console.log("profile.js patched with limits!");
