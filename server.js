require('dotenv').config();

const dns = require('dns');
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const app = express();
app.set('trust proxy', 1);

// ══════════════════════════════════════════════════════════════
// SECURITY & MIDDLEWARE
// ══════════════════════════════════════════════════════════════
app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for now as the frontend uses many inline scripts and event handlers
    crossOriginOpenerPolicy: false // Disable COOP so popups can access window.opener and communicate via postMessage
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '1gb' }));
app.use(express.urlencoded({ extended: true, limit: '1gb' }));

// CORS — allow frontend origin (Hostinger production)
const allowedOrigins = [
    process.env.FRONTEND_URL || 'https://www.vevahamatrimony.com',
    'https://www.vevahamatrimony.com',
    'https://vevahamatrimony.com',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
];
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g., mobile apps, Postman)
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`CORS: Origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Global rate limiter: 1000 API requests per 15 min per IP
// Only applied to /api/* routes — static pages and assets are excluded
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
    skip: (req) => {
        // Skip rate limiting for static page requests (non-API routes)
        return !req.path.startsWith('/api/');
    }
});

// Limiter for auth routes: 50 per 15 min (allows normal login/register usage)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: { error: 'Too many auth attempts. Please wait 15 minutes.' }
});

app.use(globalLimiter);

// Global request timeout middleware
// Set timeout for requests: 60s for file uploads, 30s for others
app.use((req, res, next) => {
    const isUploadRequest = req.path.includes('/upload') || req.path.includes('/admin-upload');
    const timeoutMs = isUploadRequest ? 60000 : 30000; // 60s for uploads, 30s for others

    const timeoutId = setTimeout(() => {
        if (!res.headersSent) {
            res.status(408).json({ error: `Request timeout after ${timeoutMs}ms` });
        }
    }, timeoutMs);

    // Ensure timeout is cleared when response is sent
    res.on('finish', () => clearTimeout(timeoutId));
    res.on('close', () => clearTimeout(timeoutId));

    next();
});

app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'VevahaMatrimony API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        supabase_url: process.env.SUPABASE_URL ? '✅ configured' : '❌ missing'
    });
});

// ══════════════════════════════════════════════════════════════
// API ROUTES
// ══════════════════════════════════════════════════════════════
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/verification', require('./routes/verification').router);
app.use('/api/profile', require('./routes/profile'));
app.get('/api/get-contact/:memberId', (req, res, next) => {
    req.url = '/get-contact/' + req.params.memberId;
    require('./routes/profile')(req, res, next);
});
app.use('/api/upload', require('./routes/upload'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/calls', require('./routes/calls'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/membership', require('./routes/membership'));
app.use('/api/signal', require('./routes/signal'));
app.use('/api/contact-message', require('./routes/contact'));
// Admin specialized API endpoints
app.use('/api', require('./routes/admin-upload'));

// ══════════════════════════════════════════════════════════════
// AI CHAT ROUTES
// ══════════════════════════════════════════════════════════════
const { handleAIChat, getConversationStarters, clearChatSession } = require('./ai-chat');
const { handleHoroscopicAIChat } = require('./horoscopic-ai-chat');

app.post('/ai/chat', handleAIChat);
app.get('/ai/conversation-starters', getConversationStarters);
app.post('/ai/clear-session', clearChatSession);
app.get('/ai/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'Vevaha AI', 
        gemini_enabled: !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY),
        fallback_active: true
    });
});


// Horoscopic AI
app.post('/horoscopic-ai/chat', handleHoroscopicAIChat);
app.get('/horoscopic-ai/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'Horoscopic AI', 
        gemini_configured: !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY) 
    });
});


// ══════════════════════════════════════════════════════════════
// STATIC FILE SERVING FOR HOSTINGER (Unified Folder)
// ══════════════════════════════════════════════════════════════
// Determine where the HTML files are (current dir on Hostinger, parent dir locally)
const staticPath = fs.existsSync(path.join(__dirname, 'index.html')) ? __dirname : path.join(__dirname, '..');

// Serve favicon.ico directly from the logo image (must be before static middleware)
app.get('/favicon.ico', (req, res) => {
    const iconPath = path.join(staticPath, 'images', 'vevaha-logo.png');
    res.sendFile(iconPath, (err) => {
        if (err) res.redirect('/images/vevaha-logo.png');
    });
});

app.use(express.static(staticPath));

// ══════════════════════════════════════════════════════════════
// 404 HANDLER FOR API
// ══════════════════════════════════════════════════════════════
app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ══════════════════════════════════════════════════════════════
// GLOBAL ERROR HANDLER
// ══════════════════════════════════════════════════════════════
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message
    });
});

// ══════════════════════════════════════════════════════════════
// START SERVER
// ══════════════════════════════════════════════════════════════
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════╗
║   VevahaMatrimony API Server             ║
║   Port   : ${PORT}                          ║
║   Mode   : ${process.env.NODE_ENV || 'development'}                  ║
║   Health : https://www.vevahamatrimony.com/health ║
╚══════════════════════════════════════════╝
    `);
});

// ══════════════════════════════════════════════════════════════
// GLOBAL PROCESS ERROR HANDLERS
// ══════════════════════════════════════════════════════════════
process.on('uncaughtException', (err) => {
    console.error('CRITICAL UNCAUGHT EXCEPTION:', err);
    // process.exit(1); // Keep alive for debugging if possible, or let nodemon handle
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION:', reason);
});

module.exports = app;
