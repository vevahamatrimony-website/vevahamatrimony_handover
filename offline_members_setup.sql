-- ============================================================
--  VEVAHA MATRIMONY — Run this ONCE in Supabase SQL Editor
--  Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================

CREATE TABLE IF NOT EXISTS public.offline_members (
    id                  BIGSERIAL PRIMARY KEY,
    member_id           TEXT UNIQUE NOT NULL,
    gender              TEXT,
    full_name           TEXT NOT NULL,
    dob                 TEXT,
    birth_time          TEXT,
    birth_place         TEXT,
    age                 TEXT,
    height              TEXT,
    education           TEXT,
    job                 TEXT,
    monthly_income      TEXT,
    father              TEXT,
    mother              TEXT,
    siblings            TEXT,
    property_details    TEXT,
    caste               TEXT,
    gotra               TEXT,
    rasi                TEXT,
    star                TEXT,
    address             TEXT,        -- stored but NEVER sent to frontend
    phone               TEXT,        -- call redirect only
    whatsapp            TEXT,        -- whatsapp redirect only
    expectations        TEXT,
    others              TEXT,
    add_ref             TEXT,
    profile_picture_url TEXT,
    jathagam_url        TEXT,
    status              TEXT DEFAULT 'active',
    added_on            DATE DEFAULT CURRENT_DATE,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offline_member_id ON public.offline_members(member_id);
CREATE INDEX IF NOT EXISTS idx_offline_gender    ON public.offline_members(gender);
CREATE INDEX IF NOT EXISTS idx_offline_caste     ON public.offline_members(caste);
CREATE INDEX IF NOT EXISTS idx_offline_status    ON public.offline_members(status);

ALTER TABLE public.offline_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read offline_members"
    ON public.offline_members FOR SELECT USING (true);

CREATE POLICY "Service role write offline_members"
    ON public.offline_members FOR ALL USING (auth.role() = 'service_role');
