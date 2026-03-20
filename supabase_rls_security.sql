-- ============================================================
-- PPM·IT — Supabase Row Level Security (RLS)
-- Run this in Supabase SQL Editor
-- ============================================================

-- NOTE: supabaseAdmin bypasses RLS via service_role key (correct)
-- These policies protect against direct API access with anon key

-- ── 1. USERS table ──────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Block all direct anon access (app uses service_role only)
CREATE POLICY "users_no_anon" ON users
  FOR ALL TO anon USING (false);

-- ── 2. SPACES table ─────────────────────────────────────────
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "spaces_no_anon" ON spaces
  FOR ALL TO anon USING (false);

-- ── 3. USER_SPACES table ────────────────────────────────────
ALTER TABLE user_spaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_spaces_no_anon" ON user_spaces
  FOR ALL TO anon USING (false);

-- ── 4. APP_SETTINGS table ───────────────────────────────────
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_no_anon" ON app_settings
  FOR ALL TO anon USING (false);

-- ── 5. SPACE_DATA table ─────────────────────────────────────
ALTER TABLE space_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "space_data_no_anon" ON space_data
  FOR ALL TO anon USING (false);

-- ── 6. PASSWORD_RESET_TOKENS table ──────────────────────────
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reset_tokens_no_anon" ON password_reset_tokens
  FOR ALL TO anon USING (false);

-- ============================================================
-- VERIFY: Run this to confirm RLS is enabled on all tables
-- ============================================================
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
