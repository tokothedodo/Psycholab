-- =====================================================
-- PsychoLab Supabase Migration
-- Run this in Supabase SQL Editor (Dashboard → SQL)
-- =====================================================

-- 1. Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'researcher',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 3. Users can read their own record
CREATE POLICY "Users can read own record"
ON users FOR SELECT
USING (auth.uid() = id);

-- 4. Users can insert their own record
CREATE POLICY "Users can insert own record"
ON users FOR INSERT
WITH CHECK (auth.uid() = id);

-- 5. Create rooms table if it doesn't exist
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  researcher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  experiment TEXT NOT NULL DEFAULT '',
  config JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Enable RLS on rooms
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- 7. RLS policies for rooms
CREATE POLICY "Researchers can insert their own rooms"
ON rooms FOR INSERT
WITH CHECK (auth.uid() = researcher_id);

CREATE POLICY "Researchers can read their own rooms"
ON rooms FOR SELECT
USING (auth.uid() = researcher_id);

CREATE POLICY "Researchers can update their own rooms"
ON rooms FOR UPDATE
USING (auth.uid() = researcher_id);

-- 8. Allow participants to read active rooms by code (for joining)
CREATE POLICY "Anyone can read active rooms"
ON rooms FOR SELECT
USING (status IN ('active', 'open'));

-- 9. Create results table if it doesn't exist
CREATE TABLE IF NOT EXISTS results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL,
  experiment_name TEXT NOT NULL,
  response_time_ms INTEGER,
  answer TEXT,
  correct_answer TEXT,
  language TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  trial_data JSONB
);

-- 10. Enable RLS on results
ALTER TABLE results ENABLE ROW LEVEL SECURITY;

-- 11. Anyone can insert results (participants are anonymous)
CREATE POLICY "Anyone can insert results"
ON results FOR INSERT
WITH CHECK (true);

-- 12. Researchers can read results for their rooms
CREATE POLICY "Researchers can read results for their rooms"
ON results FOR SELECT
USING (
  room_id IN (
    SELECT id FROM rooms WHERE researcher_id = auth.uid()
  )
);

-- =====================================================
-- If you have existing rooms with 'experiments' column (array),
-- run this to migrate:
-- ALTER TABLE rooms ADD COLUMN IF NOT EXISTS experiment TEXT DEFAULT '';
-- UPDATE rooms SET experiment = experiments[1] WHERE experiment = '' AND experiments IS NOT NULL;
-- ALTER TABLE rooms DROP COLUMN IF EXISTS experiments;
-- =====================================================
