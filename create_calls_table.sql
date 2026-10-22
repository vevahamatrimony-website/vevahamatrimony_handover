-- Create calls table for tracking voice/video calls
-- Run this on your Supabase database

-- Create the calls table
CREATE TABLE IF NOT EXISTS calls (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    call_id TEXT UNIQUE NOT NULL,
    caller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    caller_member_id TEXT,
    receiver_member_id TEXT,
    call_type TEXT NOT NULL CHECK (call_type IN ('audio', 'video')),
    status TEXT NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'connected', 'ended', 'rejected', 'missed')),
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    answered_at TIMESTAMP,
    ended_at TIMESTAMP,
    duration_seconds INT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_calls_caller_id ON calls(caller_id);
CREATE INDEX IF NOT EXISTS idx_calls_receiver_id ON calls(receiver_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_call_id ON calls(call_id);
CREATE INDEX IF NOT EXISTS idx_calls_started_at ON calls(started_at DESC);

-- Enable RLS on calls table
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own calls
CREATE POLICY calls_user_own_calls ON calls
    FOR SELECT USING (
        auth.uid() = caller_id OR auth.uid() = receiver_id
    );

-- RLS Policy: Users can insert their own calls (as caller)
CREATE POLICY calls_user_initiate ON calls
    FOR INSERT WITH CHECK (
        auth.uid() = caller_id
    );

-- RLS Policy: Users can update calls they're part of
CREATE POLICY calls_user_update ON calls
    FOR UPDATE USING (
        auth.uid() = caller_id OR auth.uid() = receiver_id
    );

-- Update profiles table to add is_manually_online if missing
-- (This was done earlier but included here for completeness)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_manually_online BOOLEAN DEFAULT true;
