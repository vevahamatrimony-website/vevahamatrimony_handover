const { createClient } = require('@supabase/supabase-js');

// Admin client — uses service_role key, bypasses RLS
// NEVER expose this key in the frontend
const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

// Public client — uses anon key (respects RLS)
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

module.exports = { supabase, supabaseAdmin };
