-- Migration: Create contact_views table for contact unlock tracking
-- Run this in Supabase SQL Editor if not already created

CREATE TABLE IF NOT EXISTS contact_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    viewed_id TEXT NOT NULL,
    viewed_member_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_viewer_viewed UNIQUE (viewer_id, viewed_id)
);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_contact_views_viewer ON contact_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_contact_views_viewed ON contact_views(viewed_id);
CREATE INDEX IF NOT EXISTS idx_contact_views_created ON contact_views(created_at DESC);

-- Enable RLS
ALTER TABLE contact_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own contact views" ON contact_views;
CREATE POLICY "Users can view own contact views" ON contact_views
    FOR SELECT USING (auth.uid() = viewer_id);

DROP POLICY IF EXISTS "Users can insert own contact views" ON contact_views;
CREATE POLICY "Users can insert own contact views" ON contact_views
    FOR INSERT WITH CHECK (auth.uid() = viewer_id);
