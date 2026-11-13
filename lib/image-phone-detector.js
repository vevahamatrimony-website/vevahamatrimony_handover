/**
 * lib/image-phone-detector.js
 * Detects Indian mobile phone numbers embedded in uploaded images
 * (Profile photos & Horoscope / Jathagam charts) using Tesseract.js OCR.
 */
const { createWorker } = require('tesseract.js');

let workerPromise = null;

/**
 * Get or initialize a reusable Tesseract worker instance
 */
async function getWorker() {
    if (!workerPromise) {
        workerPromise = (async () => {
            const worker = await createWorker('eng');
            return worker;
        })().catch(err => {
            console.error('[OCR Worker Init Failed]:', err.message);
            workerPromise = null;
            throw err;
        });
    }
    return workerPromise;
}

/**
 * Analyze text for 10-digit Indian phone numbers
 * Carefully distinguishes between astrological charts / dates and real contact numbers
 */
function detectPhoneNumberInText(text) {
    if (!text || typeof text !== 'string') return { detected: false };
    const cleanText = text.replace(/[\r\n]+/g, ' ');

    // 1. Direct standard Indian mobile number pattern:
    // Matches 10-digit numbers starting with 6, 7, 8, or 9
    // Handles prefixes like +91, 91, or 0, with optional spaces/hyphens/dots
    const rawPattern = /(?:(?:\+|0{0,2})91[\s.-]*)?(?:0[\s.-]*)?[6-9]\d{2}[\s.-]*\d{3}[\s.-]*\d{4}\b/g;
    const directMatches = cleanText.match(rawPattern);
    if (directMatches) {
        for (const m of directMatches) {
            const digitsOnly = m.replace(/\D/g, '');
            let core = digitsOnly;
            if (core.startsWith('91') && core.length === 12) core = core.slice(2);
            if (core.startsWith('0') && core.length === 11) core = core.slice(1);
            if (core.length === 10 && /^[6-9]\d{9}$/.test(core)) {
                return { detected: true, match: m.trim(), number: core };
            }
        }
    }

    // 2. Keyword + number pattern (e.g. Call, Ph, Mob, WhatsApp, Contact, Tamil keywords)
    const keywordPattern = /(?:ph(?:one)?|mob(?:ile)?|call|contact|whatsapp|tel|cell|watsapp|wa|தொடர்புக்கு|கைபேசி|தொலைபேசி|எண்)[\s:.-]*([0-9\s.-]{8,15})/gi;
    let kwMatch;
    while ((kwMatch = keywordPattern.exec(cleanText)) !== null) {
        const extractedDigits = kwMatch[1].replace(/\D/g, '');
        let core = extractedDigits;
        if (core.startsWith('91') && core.length === 12) core = core.slice(2);
        if (core.startsWith('0') && core.length === 11) core = core.slice(1);
        if (core.length === 10 && /^[6-9]\d{9}$/.test(core)) {
            return { detected: true, match: kwMatch[0].trim(), number: core };
        }
    }

    // 3. Spaced-out digits (e.g. 9 8 4 0 1 2 3 4 5 6 or 9-8-4-0-1...)
    const spacedPattern = /\b([6-9](?:[\s*#_-]*\d){9})\b/g;
    const spacedMatches = cleanText.match(spacedPattern);
    if (spacedMatches) {
        for (const sm of spacedMatches) {
            const digits = sm.replace(/\D/g, '');
            if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
                return { detected: true, match: sm.trim(), number: digits };
            }
        }
    }

    return { detected: false };
}

/**
 * Scan an image buffer or file path for phone numbers using OCR
 * @param {Buffer|string} imageBufferOrPath 
 * @param {string} [mimetype]
 * @returns {Promise<{ hasPhoneNumber: boolean, detectedNumber: string|null, match: string|null, text: string }>}
 */
async function scanImageForPhoneNumber(imageBufferOrPath, mimetype = '') {
    // Skip PDF or non-image files if passed
    if (mimetype && mimetype.includes('pdf')) {
        return { hasPhoneNumber: false, detectedNumber: null, match: null, text: '' };
    }

    try {
        const worker = await getWorker();

        // Run OCR with a safety timeout of 12 seconds so server never stalls
        const ocrPromise = worker.recognize(imageBufferOrPath);
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('OCR scan timeout')), 12000)
        );

        const result = await Promise.race([ocrPromise, timeoutPromise]);
        const extractedText = result?.data?.text || '';

        const check = detectPhoneNumberInText(extractedText);

        if (check.detected) {
            console.warn(`[Image Security] Mobile number detected in image: ${check.number} (matched "${check.match}")`);
            return {
                hasPhoneNumber: true,
                detectedNumber: check.number,
                match: check.match,
                text: extractedText
            };
        }

        return {
            hasPhoneNumber: false,
            detectedNumber: null,
            match: null,
            text: extractedText
        };

    } catch (err) {
        console.warn('[Image Security] OCR scan skipped/failed:', err.message);
        // Fail-open on timeout or worker error so valid users aren't blocked by transient OCR errors
        return {
            hasPhoneNumber: false,
            detectedNumber: null,
            match: null,
            text: '',
            scanError: err.message
        };
    }
}

/**
 * Express middleware to block uploads containing phone numbers
 */
function rejectIfImageContainsPhone(imageTypeLabel = 'image') {
    return async (req, res, next) => {
        if (!req.file || !req.file.buffer) return next();

        // Only scan image mimetypes
        const isImage = req.file.mimetype.startsWith('image/');
        if (!isImage) return next();

        const check = await scanImageForPhoneNumber(req.file.buffer, req.file.mimetype);
        if (check.hasPhoneNumber) {
            return res.status(400).json({
                error: `Phone numbers are not allowed on uploaded ${imageTypeLabel}s. Please upload an image without contact numbers.`,
                code: 'PHONE_NUMBER_DETECTED',
                detectedNumber: check.detectedNumber
            });
        }

        next();
    };
}

module.exports = {
    detectPhoneNumberInText,
    scanImageForPhoneNumber,
    rejectIfImageContainsPhone
};
