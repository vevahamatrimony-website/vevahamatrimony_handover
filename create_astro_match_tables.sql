-- ============================================================
-- VevahaMatrimony — Astro Match Feature
-- Run this ONCE in Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run
-- This is OPTIONAL — the feature works without this table.
-- It only adds optional caching of computed results.
-- ============================================================

-- Ensure star column exists in profiles (some older schemas may use 'nakshatra')
-- The profiles table already has rasi, star, lagnam columns per schema.sql
-- No changes to profiles table required.

-- Optional: Cache computed porutham results for performance
CREATE TABLE IF NOT EXISTS public.astro_match_cache (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bride_profile_id    TEXT NOT NULL,   -- can be uuid or offline member id
    groom_profile_id    TEXT NOT NULL,
    ruleset_version     TEXT NOT NULL DEFAULT 'tamil-standard-v1',
    bride_rasi          TEXT,
    bride_star          TEXT,
    groom_rasi          TEXT,
    groom_star          TEXT,
    result_json         JSONB NOT NULL,
    score               NUMERIC(5,2),
    classification      TEXT,
    calculated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(bride_profile_id, groom_profile_id, ruleset_version)
);

CREATE INDEX IF NOT EXISTS idx_astro_cache_bride ON public.astro_match_cache(bride_profile_id);
CREATE INDEX IF NOT EXISTS idx_astro_cache_groom ON public.astro_match_cache(groom_profile_id);
CREATE INDEX IF NOT EXISTS idx_astro_cache_score ON public.astro_match_cache(score DESC);

-- RLS on cache table
ALTER TABLE public.astro_match_cache ENABLE ROW LEVEL SECURITY;

-- Service role can read/write (backend uses service role)
CREATE POLICY "Service role manage astro cache"
    ON public.astro_match_cache FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================
-- NOTES:
-- 1. The profiles table already has rasi and star columns.
-- 2. Admin upload tool should populate rasi and star fields
--    from member data sheets for Astro Match to work.
-- 3. Members can fill rasi/star via their account settings.
-- ============================================================
