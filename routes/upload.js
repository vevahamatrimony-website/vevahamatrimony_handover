const router = require('express').Router();
const path = require('path');
const { supabaseAdmin } = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');
const { uploadPhoto, uploadDocument, uploadHoroscope, handleMulterError } = require('../middleware/multer');

// Timeout constants
const TIMEOUT_MS = {
    UPLOAD: 30000,     // 30 seconds for file uploads
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

// Helper: get member_id for a user
async function getMemberId(userId) {
    const { data } = await withTimeout(
        supabaseAdmin
            .from('profiles')
            .select('member_id')
            .eq('id', userId)
            .single(),
        TIMEOUT_MS.QUERY,
        'getMemberId'
    );
    return data?.member_id;
}

// Helper: upload buffer to Supabase Storage
// Path rule: bucket/member_id/filename
async function uploadToSupabase(bucket, filePath, buffer, mimetype) {
    const { data, error } = await withTimeout(
        supabaseAdmin.storage
            .from(bucket)
            .upload(filePath, buffer, {
                contentType: mimetype,
                upsert: true   // overwrite if same path
            }),
        TIMEOUT_MS.UPLOAD,
        'uploadToSupabase'
    );
    if (error) throw new Error(`Storage upload failed: ${error.message}`);
    return data.path;
}

// ══════════════════════════════════════════════════════════════
// UPLOAD PROFILE PHOTO — POST /api/upload/photo
// bucket: profile-pictures / member_id / profile.ext
// ══════════════════════════════════════════════════════════════
router.post('/photo', requireAuth, handleMulterError(uploadPhoto), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No photo file uploaded' });

        const memberId = await getMemberId(req.userId);
        if (!memberId) return res.status(404).json({ error: 'Profile not found' });

        const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg';
        const filePath = `${memberId}/profile${ext}`;

        await uploadToSupabase('profile-pictures', filePath, req.file.buffer, req.file.mimetype);

        // Get public URL
        const { data: urlData } = supabaseAdmin.storage
            .from('profile-pictures')
            .getPublicUrl(filePath);

        // Update profile row
        await withTimeout(
            supabaseAdmin
                .from('profiles')
                .update({
                    profile_photo_path: filePath,
                    profile_picture_url: urlData.publicUrl
                })
                .eq('id', req.userId),
            TIMEOUT_MS.QUERY,
            'updateProfilePhoto'
        );

        res.json({
            message: 'Profile photo uploaded',
            photo_url: urlData.publicUrl,
            path: filePath
        });

    } catch (err) {
        console.error('Photo upload error:', err.message);
        res.status(500).json({ error: err.message || 'Upload failed' });
    }
});

// ══════════════════════════════════════════════════════════════
// UPLOAD DOCUMENT — POST /api/upload/document
// body: { doc_type: 'aadhaar' | 'voter_id' | 'pan_card' | 'driving_license' }
// bucket: documents / member_id / doc_type.ext
// ══════════════════════════════════════════════════════════════
router.post('/document', requireAuth, handleMulterError(uploadDocument), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No document file uploaded' });

        const { doc_type, doc_number } = req.body;
        const ALLOWED_TYPES = ['aadhaar', 'voter_id', 'pan_card', 'driving_license'];

        if (!doc_type || !ALLOWED_TYPES.includes(doc_type)) {
            return res.status(400).json({ error: `doc_type must be one of: ${ALLOWED_TYPES.join(', ')}` });
        }

        const memberId = await getMemberId(req.userId);
        if (!memberId) return res.status(404).json({ error: 'Profile not found' });

        const ext = path.extname(req.file.originalname).toLowerCase() || '.pdf';
        const filePath = `${memberId}/${doc_type}${ext}`;

        await uploadToSupabase('documents', filePath, req.file.buffer, req.file.mimetype);

        // Build update object for profile row
        const pathField = { aadhaar: 'aadhaar_path', voter_id: 'voter_id_path', pan_card: 'pan_card_path', driving_license: 'driving_license_path' }[doc_type];
        const numberField = { aadhaar: 'aadhaar_number', voter_id: 'voter_id_number', pan_card: 'pan_number', driving_license: 'driving_license_number' }[doc_type];

        const update = { [pathField]: filePath };
        if (doc_number) update[numberField] = doc_number;

        await withTimeout(
            supabaseAdmin
                .from('profiles')
                .update(update)
                .eq('id', req.userId),
            TIMEOUT_MS.QUERY,
            'updateProfileDocument'
        );

        res.json({
            message: `${doc_type} document uploaded`,
            path: filePath,
            doc_type
        });

    } catch (err) {
        console.error('Document upload error:', err.message);
        res.status(500).json({ error: err.message || 'Upload failed' });
    }
});

// ══════════════════════════════════════════════════════════════
// UPLOAD HOROSCOPE — POST /api/upload/horoscope
// bucket: horoscopes / member_id / horoscope.ext
// ══════════════════════════════════════════════════════════════
router.post('/horoscope', requireAuth, handleMulterError(uploadHoroscope), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No horoscope file uploaded' });

        const memberId = await getMemberId(req.userId);
        if (!memberId) return res.status(404).json({ error: 'Profile not found' });

        const ext = path.extname(req.file.originalname).toLowerCase() || '.pdf';
        const filePath = `${memberId}/horoscope${ext}`;

        await uploadToSupabase('horoscopes', filePath, req.file.buffer, req.file.mimetype);

        await withTimeout(
            supabaseAdmin
                .from('profiles')
                .update({ horoscope_path: filePath, horoscope_file_path: filePath })
                .eq('id', req.userId),
            TIMEOUT_MS.QUERY,
            'updateProfileHoroscope'
        );

        res.json({
            message: 'Horoscope uploaded',
            path: filePath
        });

    } catch (err) {
        console.error('Horoscope upload error:', err.message);
        res.status(500).json({ error: err.message || 'Upload failed' });
    }
});

// ══════════════════════════════════════════════════════════════
// UPLOAD MARITAL PROOF — POST /api/upload/marital-proof
// body: { doc_type: 'divorce_decree' | 'death_certificate' | 'court_order' }
// bucket: documents / member_id / marital_doc_type.ext
// ══════════════════════════════════════════════════════════════
router.post('/marital-proof', requireAuth, handleMulterError(uploadDocument), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const { doc_type } = req.body;
        const ALLOWED_TYPES = ['divorce_decree', 'death_certificate', 'court_order'];

        if (!doc_type || !ALLOWED_TYPES.includes(doc_type)) {
            return res.status(400).json({ error: `doc_type must be one of: ${ALLOWED_TYPES.join(', ')}` });
        }

        const memberId = await getMemberId(req.userId);
        if (!memberId) return res.status(404).json({ error: 'Profile not found' });

        const ext = path.extname(req.file.originalname).toLowerCase() || '.pdf';
        const filePath = `${memberId}/marital_${doc_type}${ext}`;

        await uploadToSupabase('documents', filePath, req.file.buffer, req.file.mimetype);

        // Map doc_type to the appropriate profile column
        const pathFieldMap = {
            divorce_decree: 'divorce_decree_path',
            death_certificate: 'death_certificate_path',
            court_order: 'court_order_path'
        };
        const pathField = pathFieldMap[doc_type];

        await withTimeout(
            supabaseAdmin
                .from('profiles')
                .update({ [pathField]: filePath })
                .eq('id', req.userId),
            TIMEOUT_MS.QUERY,
            'updateMaritalProof'
        );

        res.json({
            message: `${doc_type} document uploaded`,
            path: filePath,
            doc_type
        });

    } catch (err) {
        console.error('Marital proof upload error:', err.message);
        res.status(500).json({ error: err.message || 'Upload failed' });
    }
});

// ══════════════════════════════════════════════════════════════
// GET SIGNED URL FOR PRIVATE FILE — GET /api/upload/signed-url
// query: ?bucket=documents&path=VM12345678/aadhaar.pdf
// ══════════════════════════════════════════════════════════════
router.get('/signed-url', requireAuth, async (req, res) => {
    try {
        const { bucket, path: filePath } = req.query;
        if (!bucket || !filePath) return res.status(400).json({ error: 'bucket and path required' });

        // Only allow private buckets for signed URL (profile-pictures is public)
        if (!['documents', 'horoscopes'].includes(bucket)) {
            return res.status(400).json({ error: 'Signed URLs only for private buckets' });
        }

        const memberId = await getMemberId(req.userId);

        // Security: ensure the path belongs to the requesting user
        if (!filePath.startsWith(memberId + '/')) {
            return res.status(403).json({ error: 'Access denied to this file' });
        }

        const { data, error } = await withTimeout(
            supabaseAdmin.storage
                .from(bucket)
                .createSignedUrl(filePath, 3600), // 1 hour
            TIMEOUT_MS.QUERY,
            'createSignedUrl'
        );

        if (error) throw error;
        res.json({ signed_url: data.signedUrl });

    } catch (err) {
        res.status(500).json({ error: 'Failed to generate signed URL' });
    }
});

module.exports = router;
