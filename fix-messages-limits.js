const fs = require('fs');

const mPath = 'd:/vevahamatrimony-website/routes/messages.js';
let mText = fs.readFileSync(mPath, 'utf8');

const importLimits = `
const limits = require('../middleware/limits');
`;
if (!mText.includes("require('../middleware/limits')")) {
    mText = mText.replace("const { requireAuth } = require('../middleware/auth');", "const { requireAuth } = require('../middleware/auth');" + importLimits);
}

// Locate POST /send and inject limits check
const checkMsgLogic = `
        const { receiver_id, content } = req.body;
        const sender_id = req.userId;

        // Fetch sender plan
        const { data: sender } = await supabaseAdmin.from('profiles').select('plan_name').eq('id', sender_id).single();
        const planName = sender ? sender.plan_name : 'free';

        if (!limits.canSendMessage(sender_id, planName)) {
            return res.status(403).json({ 
                error: 'Limit Reached', 
                message: 'You have exhausted your daily message limit for your current plan. Please upgrade to send unlimited messages.' 
            });
        }
`;

if (!mText.includes('limits.canSendMessage')) {
    mText = mText.replace("        const { receiver_id, content } = req.body;\n        const sender_id = req.userId;", checkMsgLogic);
}

// Now locate the insert string and insert the record decrement
const recordMsgLogic = `
        const { data, error } = await withTimeout(
            supabaseAdmin
                .from('messages')
                .insert([{ sender_id, receiver_id, content }])
                .select()
                .single(),
            TIMEOUT_MS.QUERY,
            'sendMessage'
        );

        if (!error) {
            limits.recordMessageSent(sender_id);
        }
`;

if (!mText.includes('limits.recordMessageSent')) {
    mText = mText.replace(`        const { data, error } = await withTimeout(
            supabaseAdmin
                .from('messages')
                .insert([{ sender_id, receiver_id, content }])
                .select()
                .single(),
            TIMEOUT_MS.QUERY,
            'sendMessage'
        );`, recordMsgLogic);
}

fs.writeFileSync(mPath, mText);
console.log("messages.js patched with daily limits!");
