const multer = require('multer');

// Store files in memory (buffer) — upload directly to Supabase Storage
const storage = multer.memoryStorage();

const fileFilter = (allowedTypes) => (req, file, cb) => {
    if (!allowedTypes || allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`File type ${file.mimetype} not allowed`), false);
    }
};

// Profile pictures — images only
const uploadPhoto = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: fileFilter(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
}).single('photo');

// Documents — any format allowed per spec
const uploadDocument = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
}).single('document');

// Horoscopes — any format allowed per spec
const uploadHoroscope = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
}).single('horoscope');

// Wrap multer errors into standard response
function handleMulterError(upload) {
    return (req, res, next) => {
        upload(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                return res.status(400).json({ error: `Upload error: ${err.message}` });
            }
            if (err) {
                return res.status(400).json({ error: err.message });
            }
            next();
        });
    };
}

module.exports = { uploadPhoto, uploadDocument, uploadHoroscope, handleMulterError };
