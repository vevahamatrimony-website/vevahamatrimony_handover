const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BACKUP_DIR = path.join(__dirname, 'website backup', 'website backup', 'active-members');
const JSON_PATH = path.join(BACKUP_DIR, 'active-members.json');
const PHOTO_DIR = path.join(BACKUP_DIR, 'profile-picture');
const JATHAGAM_DIR = path.join(BACKUP_DIR, 'Jathagam');

async function migrateProfiles() {
    console.log('--- Starting Migration ---');
    
    try {
        const rawData = fs.readFileSync(JSON_PATH, 'utf8');
        const profiles = JSON.parse(rawData);
        console.log(`Found ${profiles.length} profiles to migrate.`);

        for (const meta of profiles) {
            const memberId = meta.Member_id;
            const name = meta['Name (பெயர்)'] || 'New Member';
            const email = `${memberId}@vevaha-legacy.com`.toLowerCase();
            const password = `Vevaha${memberId}!`;

            console.log(`\nProcessing: ${name} (${memberId})...`);

            // 1. CREATE AUTH USER
            const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { full_name: name }
            });

            if (authErr) {
                if (authErr.message.includes('already registered')) {
                     console.log(`  - User ${email} already exists. Skipping auth creation.`);
                } else {
                     console.error(`  - Auth error for ${memberId}:`, authErr.message);
                     continue;
                }
            }

            const userId = authData?.user?.id;
            if (!userId) {
                // If user exists, find their ID
                const { data: existingUser } = await supabaseAdmin.from('profiles').select('id').eq('member_id', memberId).maybeSingle();
                if (!existingUser) {
                    console.error(`  - CRITICAL: Could not resolve UUID for ${memberId}`);
                    continue;
                }
                // we have existingUser.id if we need to update
            }

            const finalId = userId || (await supabaseAdmin.from('profiles').select('id').eq('member_id', memberId).single()).data.id;

            // 2. UPLOAD PROFILE PHOTO
            let photoUrl = null;
            let photoPath = null;
            const photoFile = path.join(PHOTO_DIR, `${memberId}.png`);
            if (fs.existsSync(photoFile)) {
                const buffer = fs.readFileSync(photoFile);
                const sPath = `${memberId}/profile.png`;
                const { error: upErr } = await supabaseAdmin.storage
                    .from('profile-pictures')
                    .upload(sPath, buffer, { contentType: 'image/png', upsert: true });

                if (!upErr) {
                    const { data: urlData } = supabaseAdmin.storage.from('profile-pictures').getPublicUrl(sPath);
                    photoUrl = urlData.publicUrl;
                    photoPath = sPath;
                    console.log(`  - Profile photo uploaded.`);
                } else {
                    console.warn(`  - Photo upload error:`, upErr.message);
                }
            }

            // 3. UPLOAD HOROSCOPE
            let horoscopePath = null;
            const jathFile = path.join(JATHAGAM_DIR, `${memberId}.png`);
            if (fs.existsSync(jathFile)) {
                const buffer = fs.readFileSync(jathFile);
                const sPath = `${memberId}/horoscope.png`;
                const { error: upErr } = await supabaseAdmin.storage
                    .from('horoscopes')
                    .upload(sPath, buffer, { contentType: 'image/png', upsert: true });

                if (!upErr) {
                    horoscopePath = sPath;
                    console.log(`  - Horoscope uploaded.`);
                } else {
                    console.warn(`  - Horoscope upload error:`, upErr.message);
                }
            }

            // 4. MAP DATA & INSERT/UPDATE PROFILE
            const profileData = {
                id: finalId,
                member_id: memberId,
                full_name: name,
                gender: meta.Gender || 'Female',
                native_place: meta['Birth Place (பிறந்த இடம்)'] || null,
                education: meta['Education (கல்வித்தகுதி)'] || null,
                job_roles: meta['Job (வேலை)'] || meta['Job'] || null,
                annual_income: meta['Monthly Income'] || null,
                height: meta['Height (உயரம்)'] || meta['Height'] || null,
                caste: meta.Caste || null,
                religion: 'Hindu',
                rasi: meta['Rasi (இராசி)'] || meta['Rasi'] || null,
                star: meta['Star (நட்சத்திரம்)'] || meta['Star'] || null,
                gotra: meta['Gotra (கோத்ரம்)'] || meta['Gotra'] || null,
                profile_picture_url: photoUrl,
                profile_photo_path: photoPath,
                horoscope_path: horoscopePath,
                horoscope_file_path: horoscopePath,
                profile_status: 'active',
                membership_status: 'premium', 
                plan_name: 'gold', // default premium for backup
                is_managed: true
            };

            // Convert Birth Date from Excel serial number if needed
            if (meta['Birth Date (பிறந்த தேதி)']) {
                const serial = parseInt(meta['Birth Date (பிறந்த தேதி)']);
                if (!isNaN(serial) && serial > 0) {
                    // Excel serial date 1 = 1900-01-01
                    const date = new Date((serial - 25569) * 86400 * 1000);
                    profileData.date_of_birth = date.toISOString().split('T')[0];
                }
            }

            const { error: upsertErr } = await supabaseAdmin
                .from('profiles')
                .upsert(profileData);

            if (upsertErr) {
                console.error(`  - DB Upsert error for ${memberId}:`, upsertErr.message);
            } else {
                console.log(`  - Profile recorded successfully.`);
            }
        }
        console.log('\n--- Migration Finished ---');

    } catch (err) {
        console.error('Migration failed:', err);
    }
}

migrateProfiles();
