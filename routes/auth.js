const router = require('express').Router();
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const https = require('https');
const { supabase, supabaseAdmin } = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');
const { verificationCache } = require('./verification');

// ══════════════════════════════════════════════════════════════
// OTP In-Memory Storage & Mailer Setup
// ══════════════════════════════════════════════════════════════
const otpCache = new Map();       // Email OTP: { email: { otp, expiresAt } }
const mobileOtpCache = new Map(); // Mobile OTP: { mobile: { expiresAt, retryCount } }

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_PORT == 465, // true for 465, false for 587 and others
    auth: {
        user: process.env.SMTP_USER || 'vevahamatrimonydb@gmail.com',
        pass: process.env.SMTP_PASS || ''
    },
    logger: true, // Log to console
    debug: true,   // Include SMTP traffic in the logs
    connectionTimeout: 10000,  // 10 seconds for establishing connection
    socketTimeout: 10000,      // 10 seconds for socket timeout
});

// Helper: send email with timeout
async function sendEmailWithTimeout(mailOptions, timeoutMs = 15000) {
    return Promise.race([
        transporter.sendMail(mailOptions),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Email send timeout (${timeoutMs}ms)`)), timeoutMs)
        )
    ]);
}

// Helper to construct absolute redirect URLs with proper protocol
function getRedirectUrl(page) {
    let frontendUrl = process.env.FRONTEND_URL || 'https://www.vevahamatrimony.com';
    if (!frontendUrl.startsWith('http://') && !frontendUrl.startsWith('https://')) {
        frontendUrl = 'https://' + frontendUrl;
    }
    if (frontendUrl.endsWith('/')) {
        frontendUrl = frontendUrl.slice(0, -1);
    }
    return `${frontendUrl}/${page}`;
}

// ══════════════════════════════════════════════════════════════
// SEND OTP — POST /api/auth/send-otp
// ══════════════════════════════════════════════════════════════
router.post('/send-otp', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        // Generate 6 digit OTP — valid for 15 minutes
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60000); // 15 mins expiry

        otpCache.set(email.toLowerCase(), { otp, expiresAt });
        // Auto-clear after expiry to prevent stale entries
        setTimeout(() => otpCache.delete(email.toLowerCase()), 15 * 60000 + 5000);

        const mailOptions = {
            from: `"Vevaha Matrimony" <${process.env.SMTP_USER || 'vevahamatrimonydb@gmail.com'}>`,
            to: email,
            subject: 'Your Vevaha Matrimony Verification Code',
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #db2777; padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">Vevaha Matrimony</h1>
                </div>
                <div style="padding: 30px; background-color: #ffffff;">
                    <h2 style="color: #1f2937; margin-top: 0;">Email Verification</h2>
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">Please use the following verification code to complete your registration process.</p>
                    <div style="background-color: #f3f4f6; border-radius: 6px; padding: 15px; margin: 25px 0; text-align: center;">
                        <span style="font-size: 32px; font-weight: bold; color: #db2777; letter-spacing: 5px;">${otp}</span>
                    </div>
                    <p style="color: #6b7280; font-size: 14px;">This code will expire in 15 minutes. If you did not request this, please ignore this email.</p>
                </div>
            </div>`
        };

        if (process.env.SMTP_PASS) {
            try {
                await sendEmailWithTimeout(mailOptions);
                console.log(`OTP Email sent to ${email} (OTP: ${otp})`);
            } catch (smtpErr) {
                console.warn('Failed to send OTP email, falling back to console log:', smtpErr.message);
                console.log(`[DEV FALLBACK] OTP for ${email} is ${otp}`);
            }
        } else {
            console.log(`[DEV MODE] OTP for ${email} is ${otp} (SMTP_PASS not set)`);
        }

        res.json({ success: true, message: 'OTP sent successfully' });
    } catch (err) {
        console.error('Send OTP Error:', err);
        // Expose the actual Nodemailer error so the user knows if it's an Auth issue or Port issue
        res.status(500).json({ error: 'Mail Error: ' + err.message });
    }
});

// ══════════════════════════════════════════════════════════════
// VERIFY OTP — POST /api/auth/verify-otp
// ══════════════════════════════════════════════════════════════
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

        const record = otpCache.get(email.toLowerCase());

        if (!record) {
            return res.status(400).json({ error: 'No OTP generated for this email or it has expired.' });
        }

        if (new Date() > record.expiresAt) {
            otpCache.delete(email.toLowerCase());
            return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
        }

        if (record.otp !== otp) {
            return res.status(400).json({ error: 'Invalid OTP. Please check the code and try again.' });
        }

        // OTP verified successfully
        otpCache.delete(email.toLowerCase());
        res.json({ success: true, message: 'Email verified successfully' });

    } catch (err) {
        console.error('Verify OTP Error:', err);
        res.status(500).json({ error: 'Failed to verify OTP' });
    }
});

// ══════════════════════════════════════════════════════════════
// SEND MOBILE OTP — POST /api/auth/send-mobile-otp
// Uses MSG91 API with DLT approved template
// ══════════════════════════════════════════════════════════════
router.post('/send-mobile-otp', async (req, res) => {
    try {
        let { mobile } = req.body;
        if (!mobile) return res.status(400).json({ error: 'Mobile number is required' });

        // Sanitize: keep digits only, strip leading +91 or 0
        mobile = String(mobile).replace(/\D/g, '');
        if (mobile.startsWith('91') && mobile.length === 12) mobile = mobile.slice(2);
        if (mobile.startsWith('0') && mobile.length === 11) mobile = mobile.slice(1);

        if (!/^[6-9]\d{9}$/.test(mobile)) {
            return res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number (starting with 6–9)' });
        }

        // Rate limit: max 5 sends per mobile per 30 mins
        const existing = mobileOtpCache.get(mobile);
        if (existing && existing.retryCount >= 5) {
            const waitMin = Math.ceil((existing.blockedUntil - Date.now()) / 60000);
            return res.status(429).json({ error: `Too many attempts. Try again in ${waitMin} minutes.` });
        }

        const MSG91_AUTH_KEY   = process.env.MSG91_AUTH_KEY;
        const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID;
        const MSG91_SENDER_ID  = process.env.MSG91_SENDER_ID  || 'VEVAHM';
        const OTP_LENGTH       = parseInt(process.env.MSG91_OTP_LENGTH)  || 6;
        const OTP_EXPIRY       = parseInt(process.env.MSG91_OTP_EXPIRY)  || 10;

        if (!MSG91_AUTH_KEY) {
            return res.status(500).json({ error: 'MSG91 not configured on server' });
        }

        // Generate a 6-digit numeric OTP code
        const generatedOtp = String(Math.floor(100000 + Math.random() * 900000));

        // Use MSG91 Flow API v5 since the template is registered under SMS (Campaigns/Flows)
        const payload = JSON.stringify({
            flow_id: MSG91_TEMPLATE_ID,
            sender: MSG91_SENDER_ID,
            recipients: [
                {
                    mobiles: `91${mobile}`,
                    numeric: generatedOtp
                }
            ]
        });

        const msg91Response = await new Promise((resolve, reject) => {
            const options = {
                hostname: 'control.msg91.com',
                path: '/api/v5/flow/',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'authkey': MSG91_AUTH_KEY,
                    'Content-Length': Buffer.byteLength(payload)
                }
            };
            const req2 = https.request(options, (resp) => {
                let data = '';
                resp.on('data', chunk => data += chunk);
                resp.on('end', () => {
                    try { resolve({ status: resp.statusCode, body: JSON.parse(data) }); }
                    catch (e) { resolve({ status: resp.statusCode, body: data }); }
                });
            });
            req2.on('error', reject);
            req2.setTimeout(15000, () => { req2.destroy(); reject(new Error('MSG91 request timeout')); });
            req2.write(payload);
            req2.end();
        });

        console.log(`MSG91 Flow send to ${mobile} (OTP: ${generatedOtp}): status=${msg91Response.status}`, msg91Response.body);

        if (msg91Response.status !== 200 || (msg91Response.body && msg91Response.body.type === 'error')) {
            const errMsg = (msg91Response.body && msg91Response.body.message) || 'Failed to send OTP via MSG91 Flow';
            return res.status(500).json({ error: errMsg });
        }

        // Track retry count and block time
        const retryCount = (existing ? existing.retryCount : 0) + 1;
        const blockedUntil = retryCount >= 5 ? Date.now() + 30 * 60 * 1000 : null;
        const expiresAt = new Date(Date.now() + OTP_EXPIRY * 60 * 1000);

        // Store OTP and expiresAt in cache
        mobileOtpCache.set(mobile, { otp: generatedOtp, expiresAt, retryCount, blockedUntil });

        // Auto-clear after expiry
        setTimeout(() => mobileOtpCache.delete(mobile), OTP_EXPIRY * 60 * 1000 + 5000);

        res.json({ success: true, message: `OTP sent to +91-${mobile.slice(0,2)}XXXXXXXX${mobile.slice(-2)}` });

    } catch (err) {
        console.error('Send Mobile OTP Error:', err);
        res.status(500).json({ error: 'Failed to send OTP: ' + err.message });
    }
});

// ══════════════════════════════════════════════════════════════
// VERIFY MOBILE OTP — POST /api/auth/verify-mobile-otp
// Delegates to MSG91 for OTP validation
// ══════════════════════════════════════════════════════════════
router.post('/verify-mobile-otp', async (req, res) => {
    try {
        let { mobile, otp } = req.body;
        if (!mobile || !otp) return res.status(400).json({ error: 'Mobile number and OTP are required' });

        // Sanitize mobile
        mobile = String(mobile).replace(/\D/g, '');
        if (mobile.startsWith('91') && mobile.length === 12) mobile = mobile.slice(2);
        if (mobile.startsWith('0') && mobile.length === 11) mobile = mobile.slice(1);

        if (!/^[6-9]\d{9}$/.test(mobile)) {
            return res.status(400).json({ error: 'Invalid mobile number format' });
        }

        // Check if we have an active session for this mobile
        const record = mobileOtpCache.get(mobile);
        if (!record) {
            return res.status(400).json({ error: 'No OTP sent for this number, or it has expired. Please request a new OTP.' });
        }
        if (new Date() > record.expiresAt) {
            mobileOtpCache.delete(mobile);
            return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
        }

        // Verify the OTP locally first for 100% reliability and speed
        if (record.otp === otp) {
            mobileOtpCache.delete(mobile);
            return res.json({ success: true, message: 'Mobile number verified successfully!' });
        }

        const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;

        // MSG91 OTP Verify API v5 fallback: GET /api/v5/otp/verify?mobile=91XXXXXXXXXX&otp=123456
        const verifyResponse = await new Promise((resolve, reject) => {
            const path = `/api/v5/otp/verify?mobile=91${mobile}&otp=${encodeURIComponent(otp)}`;
            const options = {
                hostname: 'control.msg91.com',
                path,
                method: 'GET',
                headers: { 'authkey': MSG91_AUTH_KEY }
            };
            const req2 = https.request(options, (resp) => {
                let data = '';
                resp.on('data', chunk => data += chunk);
                resp.on('end', () => {
                    try { resolve({ status: resp.statusCode, body: JSON.parse(data) }); }
                    catch (e) { resolve({ status: resp.statusCode, body: data }); }
                });
            });
            req2.on('error', reject);
            req2.setTimeout(15000, () => { req2.destroy(); reject(new Error('MSG91 verify timeout')); });
            req2.end();
        });

        console.log(`MSG91 OTP verify for ${mobile}: status=${verifyResponse.status}`, verifyResponse.body);

        const body = verifyResponse.body;
        // MSG91 returns { "type": "success", "message": "OTP verified successfully" } on success
        const isSuccess = (body && body.type === 'success') ||
                          (verifyResponse.status === 200 && body && String(body.message || '').toLowerCase().includes('verified'));

        if (!isSuccess) {
            const errMsg = (body && body.message) || 'Invalid OTP. Please check and try again.';
            return res.status(400).json({ error: errMsg });
        }

        // Clear from cache on success
        mobileOtpCache.delete(mobile);

        res.json({ success: true, message: 'Mobile number verified successfully!' });

    } catch (err) {
        console.error('Verify Mobile OTP Error:', err);
        res.status(500).json({ error: 'Failed to verify OTP: ' + err.message });
    }
});

// ══════════════════════════════════════════════════════════════
// REGISTER — POST /api/auth/register
// 1. Create Supabase auth user
// 2. Insert profile row (member_id auto-generated by DB trigger)
// ══════════════════════════════════════════════════════════════
router.post('/register', async (req, res) => {
    try {
        const email = req.body.email || req.body.email_address;
        const password = req.body.password;
        const full_name = req.body.fullName || req.body.full_name;
        const mobile_number = req.body.mobile || req.body.mobile_number || req.body.phoneInput || req.body.phone;

        if (!full_name || !email || !password) {
            return res.status(400).json({ error: 'full_name, email, and password are required' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const requireVerification = process.env.REQUIRE_DOCUMENT_VERIFICATION === 'true';
        const requireEsign = process.env.REQUIRE_ESIGN === 'true';
        
        // Always try to fetch verifiedRecord if it exists in cache
        const verifiedRecord = verificationCache.get(normalizedEmail);

        if (requireVerification) {
            if (!verifiedRecord || !verifiedRecord.verified) {
                return res.status(400).json({ error: 'Document verification is required. Please verify your identity first.' });
            }
        }

        if (requireEsign) {
            if (!verifiedRecord || !verifiedRecord.esignSigned) {
                return res.status(400).json({ error: 'Aadhaar eSign is required to complete registration.' });
            }
        }

        // Defensive backend check: if the user did verify, ensure the registered name matches
        if (verifiedRecord && verifiedRecord.verified) {
            const enteredName = full_name.trim();
            let verifiedName = (verifiedRecord.verifiedName || '').trim();
            
            // Strip parentheses and their contents (e.g. "(DigiLocker)")
            verifiedName = verifiedName.replace(/\s*\(.*?\)\s*/g, '').trim();

            const fallbacks = [
                'verified member',
                'digilocker aadhaar user',
                'verified via digilocker',
                'digilocker holder',
                'verified user'
            ];
            
            const normalizedVName = verifiedName.toLowerCase().trim();
            const isFallback = fallbacks.includes(normalizedVName);

            if (!isFallback) {
                const normalizeName = (name) => {
                    return name
                        .toLowerCase()
                        .replace(/[^a-z0-9]/g, '')
                        .trim();
                };

                if (normalizeName(enteredName) !== normalizeName(verifiedName)) {
                    return res.status(400).json({ 
                        error: `Name mismatch: The name you entered ("${enteredName}") does not match the name on the verified document ("${verifiedName}").` 
                    });
                }
            }
        }

        // 1. Create auth user in Supabase
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // skip email confirmation for now
            user_metadata: { full_name, mobile_number }
        });

        if (authError) {
            // If user already exists in auth, return clear message
            if (authError.message.includes('already been registered')) {
                return res.status(409).json({ error: 'Email already registered. Please login.' });
            }
            throw authError;
        }

        const userId = authData.user.id;

        // Mappings from frontend form names to database column names
        const COLUMN_MAPPING = {
            fullName: 'full_name',
            full_name: 'full_name',
            email: 'email_address',
            email_address: 'email_address',
            mobile: 'mobile_number',
            mobile_number: 'mobile_number',
            phoneInput: 'mobile_number',
            phone: 'mobile_number',
            dob: 'date_of_birth',
            date_of_birth: 'date_of_birth',
            dateOfBirth: 'date_of_birth',
            onBehalfOf: 'registering_on_behalf_of',
            timeOfBirth: 'time_of_birth',
            placeOfBirth: 'place_of_birth',
            heightDropdown: 'height',
            heightCustom: 'height_custom',
            weight: 'weight',
            bodyType: 'body_type',
            skinColour: 'skin_colour',
            disability: 'disability',
            disabilityOther: 'disability_other',
            numberOfChildren: 'number_of_children',
            childrenLivingStatus: 'children_living_status',
            spokenLanguage: 'spoken_language',
            eatingHabits: 'eating_habits',
            drinkingHabits: 'drinking_habits',
            smokingHabits: 'smoking_habits',
            studiedAt: 'studied_at',
            occupationOther: 'job_roles_other',
            job_roles_other: 'job_roles_other',
            familyType: 'family_type',
            aboutMyself: 'about_myself',
            motherTongue: 'mother_tongue',
            employment: 'employment_status',
            occupation: 'job_roles',
            annualIncome: 'annual_income',
            worksAt: 'works_at',
            houseStreet: 'house_building',
            locality: 'locality',
            pinCode: 'pin_code',
            nativePlace: 'native_place',
            fatherName: 'father_name',
            fatherStatus: 'father_status',
            fatherOccupation: 'father_occupation',
            motherName: 'mother_name',
            motherStatus: 'mother_status',
            motherOccupation: 'mother_occupation',
            numberOfBrothers: 'number_of_brothers',
            brotherAgeRelation: 'brothers_age_relation',
            brotherMaritalStatus: 'brothers_marital_status',
            brotherOccupationNotes: 'brothers_occupation_notes',
            numberOfSisters: 'number_of_sisters',
            sisterAgeRelation: 'sisters_age_relation',
            sisterMaritalStatus: 'sisters_marital_status',
            sisterOccupationNotes: 'sisters_occupation_notes',
            familyValues: 'family_values',
            familyStatus: 'family_status',
            familyLifestyle: 'family_lifestyle',
            familyIncome: 'family_income',
            casteOther: 'caste_other',
            subcaste: 'subcaste',
            gotra: 'gotra',
            rasi: 'rasi',
            star: 'star',
            nakshatra: 'star',
            lagnam: 'lagnam',
            dosham: 'dosham',
            preferredAgeFrom: 'preferred_age_from',
            preferredAgeTo: 'preferred_age_to',
            preferredHeightFrom: 'preferred_height_from',
            preferredHeightTo: 'preferred_height_to',
            preferredMaritalStatus: 'preferred_marital_status',
            preferredLocation: 'preferred_location',
            preferredBodyType: 'preferred_body_type',
            preferredSkinColour: 'preferred_skin_colour',
            preferredDiet: 'preferred_diet',
            preferredSmoking: 'preferred_smoking',
            preferredDrinking: 'preferred_drinking',
            preferredEducation: 'preferred_education',
            preferredProfession: 'preferred_profession',
            preferredEmploymentStatus: 'preferred_employment_status',
            preferredIncome: 'preferred_income',
            preferredMotherTongue: 'preferred_mother_tongue',
            preferredCaste: 'preferred_caste',
            preferredRasi: 'preferred_rasi',
            preferredFamilyType: 'preferred_family_type',
            preferredFamilyValues: 'preferred_family_values',
            horoscopeMatching: 'preferred_horoscope_matching',
            matchWithHoroscope: 'preferred_horoscope_matching',
            registering_on_behalf_of: 'registering_on_behalf_of',
            time_of_birth: 'time_of_birth',
            place_of_birth: 'place_of_birth',
            height: 'height',
            marital_status: 'marital_status',
            religion: 'religion',
            caste: 'caste',
            mother_tongue: 'mother_tongue',
            education: 'education',
            employment_status: 'employment_status',
            annual_income: 'annual_income',
            job_roles: 'job_roles',
            works_at: 'works_at',
            city: 'city',
            state: 'state',
            family_type: 'family_type',
            about_myself: 'about_myself',
            gender: 'gender',
            hide_photo: 'hide_photo',
            hidePhoto: 'hide_photo',
            hide_horoscope: 'hide_horoscope',
            hideHoroscope: 'hide_horoscope',
            horoscopeLock: 'hide_horoscope',
            numberOfChildren: 'number_of_children',
            childrenLivingStatus: 'children_living_status',
            divorceCaseNumber: 'divorce_case_number',
            childrenGender: 'children_gender',
            number_of_children: 'number_of_children',
            children_living_status: 'children_living_status',
            divorce_case_number: 'divorce_case_number',
            children_gender: 'children_gender'
        };

        // Prepare profile insert object
        const profileInsert = {
            id: userId,
            plan_name: 'free',
            profile_status: 'pending_verification'
        };

        // Dynamically add mapped fields from req.body
        for (const [key, val] of Object.entries(req.body)) {
            const col = COLUMN_MAPPING[key];
            if (col && val !== undefined && val !== null && val !== '') {
                if (col === 'number_of_children' || col === 'weight' || 
                    col === 'number_of_brothers' || col === 'number_of_sisters' ||
                    col === 'preferred_age_from' || col === 'preferred_age_to') {
                    const parsedNum = Number(val);
                    profileInsert[col] = isNaN(parsedNum) ? null : parsedNum;
                } else if (col === 'hide_photo' || col === 'hide_horoscope' || col === 'is_verified' || col === 'preferred_horoscope_matching') {
                    profileInsert[col] = val === true || val === 'true' || val === 'on' || val === '1' || val === 1;
                } else {
                    profileInsert[col] = String(val).trim();
                }
            }
        }

        // Ensure email_address and mobile_number are set to fallback values if missing
        if (!profileInsert.email_address) profileInsert.email_address = email;
        if (!profileInsert.mobile_number) profileInsert.mobile_number = mobile_number;
        if (!profileInsert.full_name) profileInsert.full_name = full_name;

        if (verifiedRecord) {
            profileInsert.is_verified = true;
            profileInsert.profile_status = 'verified';

            const { docType, docNumber } = verifiedRecord;
            if (docType === 'voter-id' || docType === 'voter_id') {
                profileInsert.voter_id_number = docNumber;
            } else if (docType === 'driving-license' || docType === 'driving_license') {
                profileInsert.driving_license_number = docNumber;
            } else if (docType === 'passport') {
                profileInsert.pan_number = `PASSPORT:${docNumber}`;
            } else if (docType === 'aadhaar') {
                profileInsert.aadhaar_number = docNumber;
            }
        }

        // 2. Insert profile row — admin client bypasses RLS
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert(profileInsert)
            .select()
            .single();

        if (profileError) {
            // Rollback: delete auth user if profile insert fails
            await supabaseAdmin.auth.admin.deleteUser(userId);
            throw profileError;
        }

        // 3. Sign in to get JWT session for the newly created user
        const { data: session, error: signInError } = await supabase.auth.signInWithPassword({
            email, password
        });

        if (signInError) {
            return res.status(201).json({
                message: 'Account created! Please login.',
                member_id: profile.member_id
            });
        }

        res.status(201).json({
            message: 'Registration successful!',
            member_id: profile.member_id,
            access_token: session.session.access_token,
            refresh_token: session.session.refresh_token,
            user: profile
        });

        // Welcome email disabled per product decision — member ID shown via billing page popup instead.

    } catch (err) {
        console.error('Register error full detail:', err);
        return res.status(500).json({ error: 'Registration failed' });
    }
});

// ══════════════════════════════════════════════════════════════
// LOGIN — POST /api/auth/login
// ══════════════════════════════════════════════════════════════
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Fetch profile for this user
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (!profile) {
            return res.status(404).json({ error: 'Profile not found. Please complete registration.' });
        }

        if (profile.is_blocked) {
            return res.status(403).json({ error: 'Your account has been suspended. Contact support.' });
        }

        res.json({
            message: 'Login successful',
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            user: profile
        });

    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ error: 'Login failed' });
    }
});

// ══════════════════════════════════════════════════════════════
// GOOGLE AUTH SYNC — POST /api/auth/sync-google
// Called by frontend AFTER Supabase Google OAuth completes
// Creates profile if this is a first-time Google user
// ══════════════════════════════════════════════════════════════
router.post('/sync-google', requireAuth, async (req, res) => {
    try {
        const userId = req.userId;
        const user = req.user;

        // Check if profile already exists
        const { data: existing } = await supabaseAdmin
            .from('profiles')
            .select('id, member_id, full_name, plan_name, profile_status, profile_picture_url')
            .eq('id', userId)
            .single();

        if (existing) {
            return res.json({
                isNewUser: false,
                member_id: existing.member_id,
                profile_status: existing.profile_status,
                user: existing
            });
        }

        // First-time Google user — create profile with basic info
        const fullName = user.user_metadata?.full_name
            || user.user_metadata?.name
            || user.email.split('@')[0];
        const avatarUrl = user.user_metadata?.avatar_url || null;

        const { data: profile, error } = await supabaseAdmin
            .from('profiles')
            .insert({
                id: userId,
                full_name: fullName,
                email_address: user.email,
                profile_picture_url: avatarUrl,
                plan_name: 'free',
                profile_status: 'incomplete' // redirect to account-settings
            })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            isNewUser: true,
            member_id: profile.member_id,
            profile_status: 'incomplete',
            user: profile,
            message: 'Please complete your profile to proceed.'
        });

    } catch (err) {
        console.error('Google sync error:', err.message);
        res.status(500).json({ error: 'Failed to sync Google account' });
    }
});

// ══════════════════════════════════════════════════════════════
// REFRESH TOKEN — POST /api/auth/refresh
// ══════════════════════════════════════════════════════════════
router.post('/refresh', async (req, res) => {
    try {
        const { refresh_token } = req.body;
        if (!refresh_token) return res.status(400).json({ error: 'refresh_token required' });

        const { data, error } = await supabase.auth.refreshSession({ refresh_token });
        if (error) return res.status(401).json({ error: 'Session expired. Please login again.' });

        res.json({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token
        });
    } catch (err) {
        if (!res.headersSent) {
            return res.status(500).json({ error: 'Token refresh failed' });
        }
    }
});

// ══════════════════════════════════════════════════════════════
// FORGOT PASSWORD — POST /api/auth/forgot-password
// Triggers Supabase reset email
// ══════════════════════════════════════════════════════════════
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email required' });

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: getRedirectUrl('reset-password.html')
        });

        if (error) throw error;

        res.json({ message: 'Password reset email sent. Please check your inbox.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to send reset email' });
    }
});

// ══════════════════════════════════════════════════════════════
// RESET PASSWORD — POST /api/auth/reset-password
// ══════════════════════════════════════════════════════════════
router.post('/reset-password', requireAuth, async (req, res) => {
    try {
        const { new_password } = req.body;
        if (!new_password || new_password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        const { error } = await supabaseAdmin.auth.admin.updateUserById(req.userId, {
            password: new_password
        });

        if (error) throw error;
        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Password reset failed' });
    }
});

// ══════════════════════════════════════════════════════════════
// LOGOUT — POST /api/auth/logout
// ══════════════════════════════════════════════════════════════
router.post('/logout', requireAuth, async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        await supabase.auth.signOut();
        res.json({ message: 'Logged out successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Logout failed' });
    }
});

// ══════════════════════════════════════════════════════════════
// GET GOOGLE OAUTH URL — GET /api/auth/google-url
// Returns the URL for the frontend to redirect to
// ══════════════════════════════════════════════════════════════
router.get('/google-url', async (req, res) => {
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: getRedirectUrl('home.html'),
                skipBrowserRedirect: true
            }
        });

        if (error) throw error;
        res.json({ url: data.url });
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate Google OAuth URL' });
    }
});

module.exports = router;
