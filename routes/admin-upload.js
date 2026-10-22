const router = require('express').Router();
const multer = require('multer');
const xlsx = require('xlsx');
const { supabaseAdmin } = require('../lib/supabase');

// Timeout constants
const TIMEOUT_MS = {
    QUERY: 15000,          // 15 seconds for database queries
    BULK_OPERATION: 30000, // 30 seconds for bulk operations
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

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 1024 * 1024 * 1024 } // 1GB limit
});

// Helper to normalize keys slightly
const normalizeKey = (k) => k ? k.toString().toLowerCase().trim().replace(/[^a-z0-9]/g, '') : '';

// Convert Excel serial dates (e.g., 37160) or typical date strings into YYYY-MM-DD for PostgreSQL
function parseExcelDate(val) {
    if (!val) return null;
    // Try catching exact Excel serial dates
    if (!isNaN(val) && Number(val) > 10000) {
        // Excel base date is Dec 30, 1899. 
        const date = new Date(Math.round((Number(val) - 25569) * 86400 * 1000));
        if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
    }
    // Try standard JS date parser for things like '1990-10-05' or '10/05/1990'
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    // Fallback exactly to null so the db constraint doesn't reject the whole row
    return null;
}

router.post('/upload-database-file', upload.single('databaseFile'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

        const multiseries = req.body.multiseries ? JSON.parse(req.body.multiseries) : { enabled: false, prefix: 'VM' };

        // Parse Excel from buffer
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to JSON
        const rawRows = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawRows || rawRows.length === 0) {
            return res.status(400).json({ success: false, error: 'Excel file is empty' });
        }

        const membersToInsert = [];
        const authUserIdsCreated = [];
        const timestamp = Date.now();

        // Setup chunk processing so we don't blow up Supabase API rate limits
        for (let i = 0; i < rawRows.length; i++) {
            const row = rawRows[i];

            // Map row fields flexibly
            let name = row['Name'] || row['Name (பெயர்)'] || row['பெயர்'] || row['First Name'] || `Unknown_${i}`;
            if (name && typeof name === 'string') {
                name = name.replace(/\([^)]*\)/g, '').trim(); // Remove " (ராஜேஷ்)"
            }
            let phone = row['Phone Numbers'] || row['Mobile'] || row['Phone'] || row['Whatsapp Numbers'] || '';
            let gender = row['Gender'] || row['பாலினம்'] || 'Male';
            let dob = row['Birth Date (பிறந்த தேதி)'] || row['DOB'] || row['Birth Date'] || null;
            let age = row['Age'] || null;
            let height = row['Height (உயரம்)'] || row['Height'] || '';
            let education = row['Education (கல்வித்தகுதி)'] || row['Education'] || '';
            let job = row['Job (வேலை)'] || row['Job'] || row['Occupation'] || '';
            let caste = row['Caste'] || row['சமூகப் பிரிவு'] || '';
            let rasi = row['Rasi (இராசி)'] || row['Rasi'] || '';
            let star = row['Star (நட்சத்திரம்)'] || row['Star'] || '';
            let gotra = row['Gotra (கோத்ரம்)'] || row['Gotra'] || '';

            // Clean up mobile to be roughly 10 digits if possible
            if (phone) phone = String(phone).replace(/[^0-9]/g, '').slice(0, 15);
            else phone = `0000000000`;

            const email = `import_${timestamp}_${i}@vevahamatrimony.local`;
            const randomPassword = Math.random().toString(36).slice(-10) + 'A1!';

            // 1. Create Auth user
            const { data: authData, error: authError } = await withTimeout(
                supabaseAdmin.auth.admin.createUser({
                    email,
                    password: randomPassword,
                    email_confirm: true,
                    user_metadata: { full_name: name, imported: true }
                }),
                TIMEOUT_MS.QUERY,
                'createAuthUser'
            );

            if (authError) {
                console.error(`Skipping row ${i} due to auth err:`, authError.message);
                continue; // just skip if collision or error
            }

            const userId = authData.user.id;
            authUserIdsCreated.push(userId);

            // 2. Prepare Profile object
            const profileObj = {
                id: userId,
                full_name: name,
                email_address: email,
                mobile_number: phone,
                gender: gender.toLowerCase().startsWith('f') ? 'Female' : 'Male', // Normalize
                date_of_birth: parseExcelDate(dob),
                education: education,
                job_roles: job,
                caste: caste,
                rasi: rasi,
                star: star,
                gotra: gotra,
                height: height,
                plan_name: 'free',
                profile_status: 'verified'
            };

            if (multiseries.enabled && multiseries.prefix) {
                const randomNum = Math.floor(100000 + Math.random() * 900000);
                profileObj.member_id = `${multiseries.prefix}${randomNum}`;
            } else {
                // If member_id isn't generated here, frontend might struggle to map images.
                // Assuming standard prefix 'VM' if not set
                const randomNum = Math.floor(100000 + Math.random() * 900000);
                profileObj.member_id = `VM${randomNum}`;
            }

            // Map local static directories to the database columns explicitly
            profileObj.profile_picture_url = `/images/profile-picture/${profileObj.member_id}.jpg`;
            profileObj.horoscope_path = `/images/jathagam/${profileObj.member_id}.jpg`;
            profileObj.horoscope_file_path = `/images/jathagam/${profileObj.member_id}.jpg`;

            membersToInsert.push(profileObj);

            if (i % 50 === 0) {
                console.log(`Processed ${i}/${rawRows.length} rows...`);
            }

            // Prevent rate limiting (throttle)
            if (i > 0 && i % 10 === 0) {
                await new Promise(r => setTimeout(r, 200));
            }
        }
        console.log(`Finished mapping ${membersToInsert.length} eligible rows. Beginning bulk insert...`);

        if (membersToInsert.length === 0) {
            return res.status(400).json({ success: false, error: 'Could not parse or create any valid rows' });
        }

        // 3. Insert Profiles in chunks
        const chunkSize = 50;
        let insertedCount = 0;

        for (let i = 0; i < membersToInsert.length; i += chunkSize) {
            const chunk = membersToInsert.slice(i, i + chunkSize);
            // Assuming DB triggers handle `member_id` auto-generation, we just let it insert.
            const { error: profileError } = await withTimeout(
                supabaseAdmin.from('profiles').insert(chunk),
                TIMEOUT_MS.BULK_OPERATION,
                'bulkInsertProfiles'
            );
            if (profileError) {
                console.error('Profile bulk insert error:', profileError);
                throw new Error(profileError.message); // throw error so frontend receives actual failure explanation
            } else {
                insertedCount += chunk.length;
            }
        }

        // Gather metrics
        const males = membersToInsert.filter(m => m.gender === 'Male').length;
        const females = membersToInsert.length - males;

        res.json;

    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({
            success: false,
            error: 'Internal server error while processing excel',
            details: err.message,
            stack: err.stack
        });
    }
});

router.post('/undo-upload', async (req, res) => {
    try {
        const { membersToRemove } = req.body; // array of Auth user IDs

        if (!membersToRemove || !Array.isArray(membersToRemove) || membersToRemove.length === 0) {
            return res.status(400).json({ success: false, error: 'No members provided to undo' });
        }

        // Profiles has ON DELETE CASCADE from auth.users usually, but we delete auth users
        let deleteCount = 0;
        for (const userId of membersToRemove) {
            const { error } = await withTimeout(
                supabaseAdmin.auth.admin.deleteUser(userId),
                TIMEOUT_MS.BULK_OPERATION,
                'deleteAuthUser'
            );
            if (!error) deleteCount++;
        }

        res.json({ success: true, removedCount: deleteCount });
    } catch (err) {
        console.error('Undo error:', err);
        res.status(500).json({ success: false, error: 'Failed to undo upload' });
    }
});

router.post('/delete-upload', async (req, res) => {
    try {
        const { membersToRemove } = req.body; // array of Auth user IDs

        if (!membersToRemove || !Array.isArray(membersToRemove)) {
            return res.status(400).json({ success: false, error: 'No members provided to delete' });
        }

        let deleteCount = 0;
        for (const userId of membersToRemove) {
            const { error } = await withTimeout(
                supabaseAdmin.auth.admin.deleteUser(userId),
                TIMEOUT_MS.BULK_OPERATION,
                'deleteAuthUserUpload'
            );
            if (!error) deleteCount++;
        }

        res.json({ success: true, removedCount: deleteCount });
    } catch (err) {
        console.error('Delete error:', err);
        res.status(500).json({ success: false, error: 'Failed to delete upload' });
    }
});

router.post('/redo-upload', async (req, res) => {
    // Redo is too complex to reconstruct perfectly from local storage history 
    // because passwords/emails were randomized and lost. We'll return an error.
    res.status(400).json({ success: false, error: 'Redo is currently not fully supported for Excel uploads due to security limitations. Please upload the file again.' });
});

module.exports = router;
