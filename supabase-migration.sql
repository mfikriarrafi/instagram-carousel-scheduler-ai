-- ==========================================
-- INSTAGRAM CAROUSEL AUTO-SCHEDULER SCHEMA
-- Execute this SQL code in your Supabase SQL Editor
-- ==========================================

-- 1. Create the scheduled_posts table
CREATE TABLE IF NOT EXISTS scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_at TIMESTAMPTZ NOT NULL,
  caption TEXT,
  image_urls TEXT[],                          -- array of URLs from Supabase Storage
  status TEXT DEFAULT 'scheduled',            -- scheduled | posted | failed
  instagram_post_id TEXT,                     -- filled after successful post
  error_message TEXT,
  frequency TEXT DEFAULT 'once'               -- once | daily | weekly
);

-- Enable RLS and insert permissions for easy testing
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anyone to read post schedules" ON scheduled_posts FOR SELECT USING (true);
CREATE POLICY "Allow anyone to manage post schedules" ON scheduled_posts FOR ALL USING (true);

-- 2. Create the app_config table
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read-access to config keys" ON app_config FOR SELECT USING (true);
CREATE POLICY "Allow update-access to config keys" ON app_config FOR ALL USING (true);

-- 3. Seed Instagram credentials placeholder
INSERT INTO app_config (key, value) 
VALUES ('instagram_access_token', 'TOKEN_ANDA_DI_SINI')
ON CONFLICT (key) DO NOTHING;
