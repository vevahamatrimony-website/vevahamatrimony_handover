const { supabaseAdmin } = require('../lib/supabase');

/**
 * Middleware: Verify Supabase JWT from Authorization header
 * Attaches req.user and req.userId on success
 */
async function requireAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid Authorization header' });
        }

        const token = authHeader.split(' ')[1];

        // Verify token with Supabase admin
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        req.user = user;
        req.userId = user.id;
        next();
    } catch (err) {
        console.error('Auth middleware error:', err.message);
        res.status(500).json({ error: 'Authentication error' });
    }
}

/**
 * Middleware: Attach user if token present, but don't block if missing
 */
async function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const { data: { user } } = await supabaseAdmin.auth.getUser(token);
            if (user) { req.user = user; req.userId = user.id; }
        }
        next();
    } catch (_) {
        next();
    }
}

module.exports = { requireAuth, optionalAuth };
