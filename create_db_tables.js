require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://tjndhvwvsvztdkclqfpp.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTables() {
    console.log('Attempting to create matching tables...');

    // We use Supabase's `rpc` function to execute raw SQL, assuming we have a function to do so.
    // However, if we don't have exec_sql, we'll try standard table inserts. Since Supabase REST doesn't natively do DDL, we're likely stuck if we don't have direct DB access or `exec_sql`.

    // A better approach: We'll instruct the user to run SQL in their Supabase Dashboard, as creating tables via REST JS library isn't directly supported without an RPC wrapper.
    console.log('SQL Required to be run in Supabase SQL Editor:');

    const sql = `
-- Drop tables if they exist to be safe
DROP TABLE IF EXISTS public.messages;
DROP TABLE IF EXISTS public.match_requests;

-- Create match_requests table
CREATE TABLE public.match_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sender_id, receiver_id)
);

-- Let authenticated users read/write their requests
ALTER TABLE public.match_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their requests" 
    ON public.match_requests FOR SELECT 
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can insert requests" 
    ON public.match_requests FOR INSERT 
    WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their received requests" 
    ON public.match_requests FOR UPDATE 
    USING (auth.uid() = receiver_id);

-- Create messages table
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their messages" 
    ON public.messages FOR SELECT 
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can insert messages" 
    ON public.messages FOR INSERT 
    WITH CHECK (auth.uid() = sender_id);
    `;

    console.log(sql);
}

createTables();
