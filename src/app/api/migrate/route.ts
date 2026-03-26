import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

export async function POST() {
  const results: string[] = [];

  // 1. Add avatar column to users (idempotent via ALTER TABLE IF NOT EXISTS equiv)
  try {
    await supabaseAdmin.from('users').select('avatar').limit(1);
    results.push('avatar column: already exists');
  } catch {
    // Column doesn't exist — can't run ALTER TABLE via Supabase JS, need raw SQL
    results.push('avatar column: needs manual SQL (see below)');
  }

  // 3. Check has_global_access column
  try {
    await supabaseAdmin.from('users').select('has_global_access').limit(1);
    results.push('has_global_access column: already exists');
  } catch {
    results.push('has_global_access column: needs manual SQL (see below)');
  }

  // 2. Check/create password_reset_tokens table
  const { error: checkErr } = await supabaseAdmin
    .from('password_reset_tokens')
    .select('id')
    .limit(1);

  if (checkErr && checkErr.message.includes('does not exist')) {
    results.push('password_reset_tokens: needs manual SQL');
  } else {
    results.push('password_reset_tokens: exists');
  }

  const sql = `
-- Run this in your Supabase SQL Editor:

-- 1. Add avatar to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;

-- 3. Add has_global_access to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_global_access BOOLEAN DEFAULT FALSE;

-- 4. Fix users_role_check constraint to include space_admin
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('superadmin', 'admin', 'global', 'member', 'space_admin'));

-- 2. Create password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prt_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_prt_user ON password_reset_tokens(user_id);
  `;

  return NextResponse.json({ results, sql });
}
