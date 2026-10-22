-- =================================================================
-- VEVAHAMATRIMONY — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- =================================================================

-- ── Helper: generate unique VM########  member_id ──────────────
CREATE OR REPLACE FUNCTION public.generate_member_id()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  candidate text;
  tries int := 0;
BEGIN
  LOOP
    candidate := 'VM' || 
                 (floor(random() * 9 + 1)::int)::text ||
                 (floor(random() * 9 + 1)::int)::text ||
                 (floor(random() * 9 + 1)::int)::text ||
                 (floor(random() * 9 + 1)::int)::text ||
                 (floor(random() * 9 + 1)::int)::text ||
                 (floor(random() * 9 + 1)::int)::text ||
                 (floor(random() * 9 + 1)::int)::text ||
                 (floor(random() * 9 + 1)::int)::text;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE member_id = candidate);
    tries := tries + 1;
    IF tries > 30 THEN RAISE EXCEPTION 'Cannot generate unique member_id'; END IF;
  END LOOP;
  RETURN candidate;
END;
$$;

-- ── Helper: auto-update updated_at ─────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- =================================================================
-- 1. PROFILES TABLE
-- =================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  -- identity
  id                        uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id                 text UNIQUE NOT NULL DEFAULT public.generate_member_id(),

  -- basic info
  registering_on_behalf_of  text,
  full_name                 text NOT NULL,
  gender                    text,
  date_of_birth             date,
  time_of_birth             time,
  place_of_birth            text,
  mobile_number             text,
  email_address             text,
  hide_photo                boolean DEFAULT false,

  -- physical
  height                    text,
  height_custom             text,
  weight                    text,
  body_type                 text,
  skin_colour               text,
  disability                text,
  disability_other          text,

  -- marital
  marital_status            text DEFAULT 'Never Married',
  number_of_children        integer,
  children_living_status    text,
  divorce_decree_path       text,
  court_order_path          text,
  death_certificate_path    text,
  divorce_case_number       text,
  children_gender           text,

  -- languages & habits
  spoken_language           text,
  mother_tongue             text,
  eating_habits             text,
  smoking_habits            text,
  drinking_habits           text,

  -- education & employment
  education                 text,
  studied_at                text,
  employment_status         text,
  annual_income             text,
  job_roles                 text,
  job_roles_other           text,
  works_at                  text,

  -- address
  house_building            text,
  locality                  text,
  city                      text,
  state                     text,
  pin_code                  text,
  native_place              text,

  -- family
  father_name               text,
  father_status             text,
  father_occupation         text,
  mother_name               text,
  mother_status             text,
  mother_occupation         text,
  number_of_brothers        integer,
  brothers_age_relation     text,
  brothers_marital_status   text,
  brothers_occupation_notes text,
  number_of_sisters         integer,
  sisters_age_relation      text,
  sisters_marital_status    text,
  sisters_occupation_notes  text,
  family_type               text,
  family_values             text,
  family_status             text,
  family_lifestyle          text,
  family_income             text,
  about_myself              text,

  -- religion / horoscope
  religion                  text,
  caste                     text,
  caste_other               text,
  subcaste                  text,
  gotra                     text,
  rasi                      text,
  star                      text,
  lagnam                    text,
  dosham                    text,
  horoscope_path            text,

  -- partner preferences
  preferred_age_from        integer,
  preferred_age_to          integer,
  preferred_height_from     text,
  preferred_height_to       text,
  preferred_marital_status  text,
  preferred_location        text,
  preferred_body_type       text,
  preferred_skin_colour     text,
  preferred_diet            text,
  preferred_smoking         text,
  preferred_drinking        text,
  preferred_education       text,
  preferred_profession      text,
  preferred_employment_status text,
  preferred_income          text,
  preferred_mother_tongue   text,
  preferred_caste           text,
  preferred_rasi            text,
  preferred_family_type     text,
  preferred_family_values   text,
  preferred_horoscope_matching text,

  -- file storage paths  (bucket/member_id/filename)
  profile_photo_path        text,
  profile_picture_url       text,
  horoscope_file_path       text,
  documents_paths           jsonb DEFAULT '[]',

  -- identity documents
  aadhaar_path              text,
  aadhaar_number            text,
  voter_id_path             text,
  voter_id_number           text,
  driving_license_path      text,
  driving_license_number    text,
  pan_card_path             text,
  pan_number                text,

  -- membership
  plan_name                 text DEFAULT 'free',
  plan_expiry_date          timestamptz,
  membership_status         text DEFAULT 'active',
  membership_updated_at     timestamptz,
  last_payment_date         timestamptz,

  -- profile state
  profile_status            text DEFAULT 'pending_verification',
  is_verified               boolean DEFAULT false,
  is_blocked                boolean DEFAULT false,
  profile_visibility        text DEFAULT 'public',

  -- timestamps
  created_at                timestamptz DEFAULT now(),
  updated_at                timestamptz DEFAULT now()
);

-- Auto update updated_at
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =================================================================
-- 2. MESSAGES TABLE
-- =================================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content     text NOT NULL,
  is_read     boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX idx_messages_sender   ON public.messages(sender_id);
CREATE INDEX idx_messages_receiver ON public.messages(receiver_id);

-- =================================================================
-- 3. REQUESTS (INTEREST) TABLE
-- =================================================================
CREATE TABLE IF NOT EXISTS public.requests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status      text DEFAULT 'pending', -- pending | accepted | rejected
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(sender_id, receiver_id)
);
CREATE TRIGGER trg_requests_updated_at
  BEFORE UPDATE ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =================================================================
-- 4. PAYMENTS TABLE
-- =================================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  razorpay_order_id     text,
  razorpay_payment_id   text,
  razorpay_signature    text,
  plan_name             text NOT NULL,
  amount                integer NOT NULL, -- in paise (INR × 100)
  currency              text DEFAULT 'INR',
  status                text DEFAULT 'created', -- created | paid | failed | refunded
  method                text,
  created_at            timestamptz DEFAULT now()
);
CREATE INDEX idx_payments_user ON public.payments(user_id);

-- =================================================================
-- 5. PLAN USAGE TABLE (Gold: 10 messages/week)
-- =================================================================
CREATE TABLE IF NOT EXISTS public.plan_usage (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_count integer DEFAULT 0,
  week_start    date NOT NULL,
  UNIQUE(user_id, week_start)
);

-- =================================================================
-- ROW LEVEL SECURITY (RLS)
-- =================================================================

-- ── profiles ──────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can read non-blocked, non-hidden profiles
CREATE POLICY "Public profiles readable"
  ON public.profiles FOR SELECT
  USING (is_blocked = false AND profile_visibility = 'public');

-- Users can read their own profile (even if blocked/private)
CREATE POLICY "Own profile full access"
  ON public.profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── messages ──────────────────────────────────────────────────
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own messages"
  ON public.messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users send messages"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Mark own received as read"
  ON public.messages FOR UPDATE
  USING (auth.uid() = receiver_id);

-- ── requests ──────────────────────────────────────────────────
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own requests"
  ON public.requests FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users send requests"
  ON public.requests FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Receiver updates request status"
  ON public.requests FOR UPDATE
  USING (auth.uid() = receiver_id OR auth.uid() = sender_id);

-- ── payments ──────────────────────────────────────────────────
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);

-- Backend inserts via service_role (bypasses RLS) — no insert policy needed for users

-- ── plan_usage ────────────────────────────────────────────────
ALTER TABLE public.plan_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own usage"
  ON public.plan_usage FOR SELECT
  USING (auth.uid() = user_id);

-- =================================================================
-- STORAGE BUCKET POLICIES
-- Run after creating buckets in Supabase Dashboard
-- =================================================================

-- profile-pictures bucket: public read, authenticated write with member_id folder
INSERT INTO storage.buckets (id, name, public) VALUES
  ('profile-pictures', 'profile-pictures', true),
  ('documents', 'documents', false),
  ('horoscopes', 'horoscopes', false)
ON CONFLICT (id) DO NOTHING;

-- profile-pictures: anyone can read (public bucket)
CREATE POLICY "Public read profile pictures"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-pictures');

-- authenticated users can upload to their own folder
CREATE POLICY "Auth upload profile pictures"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-pictures'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Auth upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Auth read own documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Auth upload horoscopes"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'horoscopes'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Auth read own horoscopes"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'horoscopes'
    AND auth.role() = 'authenticated'
  );
