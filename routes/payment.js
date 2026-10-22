const router = require('express').Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { supabaseAdmin } = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

// Timeout constants
const TIMEOUT_MS = {
    RAZORPAY: 10000,  // 10 seconds for Razorpay API calls
    QUERY: 15000,     // 15 seconds for database queries
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

// Plan price list (paise = INR x 100) - all prices are GST-inclusive
const PLAN_PRICES = {
    silver:  117900,   // ₹999 + 18% GST = ₹1,178.82 ~ ₹1,179
    gold:    235900,   // ₹1,999 + 18% GST = ₹2,358.82 ~ ₹2,359
    diamond: 471900,   // ₹3,999 + 18% GST = ₹4,718.82 ~ ₹4,719
    vip:     5899900   // ₹49,999 + 18% GST = ₹58,998.82 ~ ₹58,999
};

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// ══════════════════════════════════════════════════════════════
// CREATE ORDER / SUBSCRIPTION — POST /api/payment/create-order
// ══════════════════════════════════════════════════════════════
router.post('/create-order', requireAuth, async (req, res) => {
    try {
        const { plan } = req.body;

        if (!plan || !PLAN_PRICES[plan]) {
            return res.status(400).json({
                error: `Invalid plan. Choose from: ${Object.keys(PLAN_PRICES).join(', ')}`
            });
        }

        const amount = PLAN_PRICES[plan];
        const currency = 'INR';

        // Get user info for receipt
        const { data: profile } = await withTimeout(
            supabaseAdmin
                .from('profiles')
                .select('member_id, full_name, email_address')
                .eq('id', req.userId)
                .single(),
            TIMEOUT_MS.QUERY,
            'getProfileInfo'
        );

        if (plan === 'silver' && process.env.RAZORPAY_SILVER_PLAN_ID) {
            // Auto-renewal Subscription Logic
            const subscription = await withTimeout(
                razorpay.subscriptions.create({
                    plan_id: process.env.RAZORPAY_SILVER_PLAN_ID,
                    total_count: 120, // 10 years theoretical max
                    customer_notify: 1,
                    notes: {
                        user_id: req.userId,
                        member_id: profile?.member_id,
                        plan: 'silver',
                        email: profile?.email_address
                    }
                }),
                TIMEOUT_MS.RAZORPAY,
                'razorpay.subscriptions.create'
            );

            // Save pending payment record (using subscription.id in place of order_id)
            await withTimeout(
                supabaseAdmin
                    .from('payments')
                    .insert({
                        user_id: req.userId,
                        razorpay_order_id: subscription.id,
                        plan_name: plan,
                        amount: amount / 100, // store in INR
                        currency,
                        status: 'created'
                    }),
                TIMEOUT_MS.QUERY,
                'insertPaymentRecord'
            );

            return res.json({
                subscription_id: subscription.id,
                amount: amount,
                currency: currency,
                key_id: process.env.RAZORPAY_KEY_ID,
                plan,
                type: 'subscription'
            });

        } else {
            // Standard One-Time Order Logic
            const order = await withTimeout(
                razorpay.orders.create({
                    amount,
                    currency,
                    receipt: `receipt_${profile?.member_id}_${Date.now()}`,
                    notes: {
                        user_id: req.userId,
                        member_id: profile?.member_id,
                        plan,
                        email: profile?.email_address
                    }
                }),
                TIMEOUT_MS.RAZORPAY,
                'razorpay.orders.create'
            );

            // Save pending payment record
            await withTimeout(
                supabaseAdmin
                    .from('payments')
                    .insert({
                        user_id: req.userId,
                        razorpay_order_id: order.id,
                        plan_name: plan,
                        amount: amount / 100, // store in INR
                        currency,
                        status: 'created'
                    }),
                TIMEOUT_MS.QUERY,
                'insertPaymentRecord'
            );

            return res.json({
                order_id: order.id,
                amount: order.amount,
                currency: order.currency,
                key_id: process.env.RAZORPAY_KEY_ID,
                plan,
                type: 'one-time'
            });
        }

    } catch (err) {
        console.error('Create order error:', err.message);
        res.status(500).json({ error: 'Failed to create payment order' });
    }
});

// ══════════════════════════════════════════════════════════════
// VERIFY PAYMENT — POST /api/payment/verify
// ══════════════════════════════════════════════════════════════
router.post('/verify', requireAuth, async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, razorpay_subscription_id, plan } = req.body;

        if (!razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ error: 'Missing payment verification data' });
        }

        // The ID the payment is bound to (either order or sub)
        const primaryId = razorpay_subscription_id || razorpay_order_id;
        
        if (!primaryId) {
            return res.status(400).json({ error: 'Missing order_id or subscription_id' });
        }

        // ── Verify Razorpay signature ──────────────────────
        // For orders: HMAC(order_id + "|" + payment_id)
        // For subscriptions: HMAC(payment_id + "|" + subscription_id)
        const signingPayload = razorpay_subscription_id 
            ? `${razorpay_payment_id}|${razorpay_subscription_id}`
            : `${razorpay_order_id}|${razorpay_payment_id}`;

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(signingPayload)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            // Mark payment as failed
            await withTimeout(
                supabaseAdmin
                    .from('payments')
                    .update({ status: 'failed', razorpay_payment_id, razorpay_signature })
                    .eq('razorpay_order_id', primaryId),
                TIMEOUT_MS.QUERY,
                'updatePaymentFailed'
            );

            return res.status(400).json({ error: 'Payment verification failed. Signature mismatch.' });
        }

        // ── Fetch payment details from Razorpay ───────────
        const paymentInfo = await withTimeout(
            razorpay.payments.fetch(razorpay_payment_id),
            TIMEOUT_MS.RAZORPAY,
            'razorpay.payments.fetch'
        );

        // ── Calculate dynamic plan expiry ─────────────────
        const expiryDate = new Date();
        if (plan === 'silver') expiryDate.setDate(expiryDate.getDate() + 30);
        else if (plan === 'gold') expiryDate.setDate(expiryDate.getDate() + 90);
        else if (plan === 'diamond') expiryDate.setDate(expiryDate.getDate() + 180);
        else if (plan === 'vip') expiryDate.setDate(expiryDate.getDate() + 365); // 12 months
        else expiryDate.setDate(expiryDate.getDate() + 30); // fallback

        // ── Update profile plan ────────────────────────────
        await withTimeout(
            supabaseAdmin
                .from('profiles')
                .update({
                    plan_name: plan,
                    plan_expiry_date: expiryDate.toISOString(),
                    membership_status: 'active',
                    membership_updated_at: new Date().toISOString(),
                    last_payment_date: new Date().toISOString()
                })
                .eq('id', req.userId),
            TIMEOUT_MS.QUERY,
            'updateProfilePlan'
        );

        // ── Mark payment as paid ───────────────────────────
        await withTimeout(
            supabaseAdmin
                .from('payments')
                .update({
                    status: 'paid',
                    razorpay_payment_id,
                    razorpay_signature,
                    method: paymentInfo.method
                })
                .eq('razorpay_order_id', primaryId),
            TIMEOUT_MS.QUERY,
            'updatePaymentPaid'
        );

        res.json({
            message: `🎉 Payment successful! Your ${plan.toUpperCase()} plan is now active.`,
            plan,
            expires: expiryDate.toISOString(),
            payment_id: razorpay_payment_id
        });

    } catch (err) {
        console.error('Verify payment error:', err.message);
        res.status(500).json({ error: 'Payment verification failed' });
    }
});

// ══════════════════════════════════════════════════════════════
// WEBHOOK — POST /api/payment/razorpay-webhook
// Automatically adds 30 days when a recurring auto-payment clears
// ══════════════════════════════════════════════════════════════
router.post('/razorpay-webhook', async (req, res) => {
    try {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
        const requestedSignature = req.headers['x-razorpay-signature'];
        const payload = req.body; // Assuming body-parser applies

        // Verify webhook signature
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(JSON.stringify(payload))
            .digest('hex');

        if (expectedSignature !== requestedSignature) {
            console.warn('[Webhook] Invalid signature');
            return res.status(400).send('Invalid signature');
        }

        const event = payload.event;

        if (event === 'subscription.charged') {
            const subscriptionInfo = payload.payload.subscription.entity;
            const subId = subscriptionInfo.id;
            
            // Extract user id from notes (attached during create)
            const notes = subscriptionInfo.notes || {};
            const userId = notes.user_id;

            if (userId) {
                // Add exactly 30 days natively because this hook fires *on each renewal*!
                const newExpiryDate = new Date();
                newExpiryDate.setDate(newExpiryDate.getDate() + 30);

                await supabaseAdmin
                    .from('profiles')
                    .update({
                        plan_expiry_date: newExpiryDate.toISOString(),
                        membership_status: 'active',
                        membership_updated_at: new Date().toISOString(),
                        last_payment_date: new Date().toISOString()
                    })
                    .eq('id', userId);
                
                // Track this invisible payment
                await supabaseAdmin
                    .from('payments')
                    .insert({
                        user_id: userId,
                        razorpay_order_id: subId, 
                        razorpay_payment_id: payload.payload.payment?.entity?.id || 'auto-renewal',
                        plan_name: 'silver',
                        amount: payload.payload.payment?.entity?.amount / 100,
                        currency: 'INR',
                        status: 'paid',
                        method: 'auto-renewal'
                    });
                
                console.log(`[Webhook] Success: Auto-renewed Silver plan for user ${userId}. Valid until ${newExpiryDate.toISOString()}`);
            }
        } else if (event === 'subscription.cancelled' || event === 'subscription.halted') {
            console.log(`[Webhook] Subscription ${event} for notes:`, payload.payload.subscription.entity.notes);
            // Will downgrade automatically via `routes/profile.js` upon expiry. Minimum disruption.
        }

        res.status(200).send('ok');
    } catch (err) {
        console.error('[Webhook] Error:', err.message);
        res.status(500).send('Webhook parsing failed');
    }
});

// ══════════════════════════════════════════════════════════════
// PAYMENT HISTORY — GET /api/payment/history
// ══════════════════════════════════════════════════════════════
router.get('/history', requireAuth, async (req, res) => {
    try {
        const { data, error } = await withTimeout(
            supabaseAdmin
                .from('payments')
                .select('*')
                .eq('user_id', req.userId)
                .order('created_at', { ascending: false }),
            TIMEOUT_MS.QUERY,
            'getPaymentHistory'
        );

        if (error) throw error;

        const totalSpent = (data || [])
            .filter(p => p.status === 'paid')
            .reduce((sum, p) => sum + (p.amount || 0), 0);

        res.json({ payments: data || [], total_spent: totalSpent });

    } catch (err) {
        console.error('Payment history error:', err.message);
        res.status(500).json({ error: 'Failed to load payment history' });
    }
});

// ══════════════════════════════════════════════════════════════
// REDIRECT CALLBACK — POST /api/payment/callback
// Processes external redirect payment submissions from Razorpay
// ══════════════════════════════════════════════════════════════
router.post('/callback', async (req, res) => {
    try {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature, razorpay_subscription_id } = req.body;
        const redirectPage = req.query.redirect_to || 'home.html';

        if (!razorpay_payment_id || !razorpay_signature) {
            console.error('Payment callback: missing signature or payment ID');
            return res.redirect(`/failed.html?error=${encodeURIComponent('Missing payment verification data')}&code=BAD_PARAMS`);
        }

        const primaryId = razorpay_subscription_id || razorpay_order_id;
        if (!primaryId) {
            console.error('Payment callback: missing order or subscription ID');
            return res.redirect(`/failed.html?error=${encodeURIComponent('Missing order or subscription ID')}&code=BAD_PARAMS`);
        }

        // Verify Razorpay signature
        const signingPayload = razorpay_subscription_id 
            ? `${razorpay_payment_id}|${razorpay_subscription_id}`
            : `${razorpay_order_id}|${razorpay_payment_id}`;

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(signingPayload)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            // Mark payment as failed in database
            await withTimeout(
                supabaseAdmin
                    .from('payments')
                    .update({ status: 'failed', razorpay_payment_id, razorpay_signature })
                    .eq('razorpay_order_id', primaryId),
                TIMEOUT_MS.QUERY,
                'updatePaymentFailed'
            );
            console.error('Payment callback: signature mismatch');
            return res.redirect(`/failed.html?error=${encodeURIComponent('Signature verification failed')}&code=BAD_SIGNATURE`);
        }

        // Look up payment details to map user and plan
        const { data: paymentRecord, error: fetchErr } = await withTimeout(
            supabaseAdmin
                .from('payments')
                .select('*')
                .eq('razorpay_order_id', primaryId)
                .single(),
            TIMEOUT_MS.QUERY,
            'fetchPaymentRecord'
        );

        if (fetchErr || !paymentRecord) {
            console.error('Payment callback: payment record not found in database for ID:', primaryId, fetchErr);
            return res.redirect(`/failed.html?error=${encodeURIComponent('Payment record not found')}&code=DB_MISSING`);
        }

        const userId = paymentRecord.user_id;
        const plan = paymentRecord.plan_name;

        // Fetch transaction details from Razorpay
        const paymentInfo = await withTimeout(
            razorpay.payments.fetch(razorpay_payment_id),
            TIMEOUT_MS.RAZORPAY,
            'razorpay.payments.fetch'
        );

        // Expiry date calculation
        const expiryDate = new Date();
        if (plan === 'silver') expiryDate.setDate(expiryDate.getDate() + 30);
        else if (plan === 'gold') expiryDate.setDate(expiryDate.getDate() + 90);
        else if (plan === 'diamond') expiryDate.setDate(expiryDate.getDate() + 180);
        else if (plan === 'vip') expiryDate.setDate(expiryDate.getDate() + 365);
        else expiryDate.setDate(expiryDate.getDate() + 30);

        // Update profile membership
        await withTimeout(
            supabaseAdmin
                .from('profiles')
                .update({
                    plan_name: plan,
                    plan_expiry_date: expiryDate.toISOString(),
                    membership_status: 'active',
                    membership_updated_at: new Date().toISOString(),
                    last_payment_date: new Date().toISOString()
                })
                .eq('id', userId),
            TIMEOUT_MS.QUERY,
            'updateProfilePlan'
        );

        // Mark payment as paid
        await withTimeout(
            supabaseAdmin
                .from('payments')
                .update({
                    status: 'paid',
                    razorpay_payment_id,
                    razorpay_signature,
                    method: paymentInfo.method || 'unknown'
                })
                .eq('razorpay_order_id', primaryId),
            TIMEOUT_MS.QUERY,
            'updatePaymentPaid'
        );

        console.log(`[Payment Callback] Successfully verified payment for user ${userId}, plan ${plan}`);
        return res.redirect(`/${redirectPage}?payment=success&plan=${plan}`);

    } catch (err) {
        console.error('Payment callback handler error:', err.message);
        return res.redirect(`/failed.html?error=${encodeURIComponent(err.message)}&code=SERVER_ERROR`);
    }
});

module.exports = router;
