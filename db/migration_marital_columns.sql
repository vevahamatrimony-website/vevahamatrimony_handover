-- ═══════════════════════════════════════════════════════════════
-- Migration: Add marital status detail columns to profiles table
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ═══════════════════════════════════════════════════════════════

-- 1. Add divorce case number (for "Awaiting Divorce" registrations)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS divorce_case_number text;

-- 2. Add children's gender field
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS children_gender text;

-- Confirm the columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('divorce_case_number', 'children_gender');
