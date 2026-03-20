import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';
import { getSessionUser, getTokenFromRequest, hashPassword } from '@/lib/db/auth';

// POST /api/auth/reset-request — user requests password reset (no email, flags admin)
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, email, first_name, active')
      .eq('email', email.toLowerCase().trim())
      .eq('active', true)
      .single();

    // Always return success to avoid user enumeration
    if (!user) return NextResponse.json({ ok: true });

    // Flag the user as "password reset requested" via a metadata column
    // Try to update password_reset_requested_at — may need migration
    const { error } = await supabaseAdmin
      .from('users')
      .update({ password_reset_requested_at: new Date().toISOString() } as any)
      .eq('id', user.id);

    if (error && (error.message?.includes('password_reset_requested_at') || error.code === '42703')) {
      // Column doesn't exist yet — store in a fallback way using a separate table or just return ok
      // The admin will see the request in the UI via the reset_tokens table check
      console.log(`[RESET REQUEST] User ${user.email} requested password reset`);
    }

    // Also try to insert into password_reset_tokens as a flag (table might not exist)
    try {
      const { randomBytes } = await import('crypto');
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h

      await supabaseAdmin.from('password_reset_tokens').insert({
        user_id: user.id,
        token,
        expires_at: expiresAt,
        used: false,
      });
    } catch {
      // Table doesn't exist yet — that's OK
      console.log(`[RESET REQUEST] Could not store token (migration pending). User: ${user.email}`);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Reset request error:', err);
    return NextResponse.json({ ok: true }); // Always return ok
  }
}

// PATCH /api/auth/reset-request — admin sets new password for a user
export async function PATCH(req: NextRequest) {
  const authToken = getTokenFromRequest(req);
  if (!authToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = await getSessionUser(authToken);
  if (!admin || !['superadmin', 'admin'].includes(admin.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { userId, newPassword } = await req.json();
    if (!userId || !newPassword) return NextResponse.json({ error: 'userId and newPassword required' }, { status: 400 });
    if (newPassword.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });

    const hash = await hashPassword(newPassword);
    const updates: any = { password_hash: hash };

    // Clear reset request flag if column exists
    const { error } = await supabaseAdmin.from('users').update(updates).eq('id', userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Mark any pending reset tokens as used
    try {
      await supabaseAdmin
        .from('password_reset_tokens')
        .update({ used: true })
        .eq('user_id', userId)
        .eq('used', false);
    } catch { /* table may not exist yet */ }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// GET /api/auth/reset-request — admin fetches pending reset requests
export async function GET(req: NextRequest) {
  const authToken = getTokenFromRequest(req);
  if (!authToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = await getSessionUser(authToken);
  if (!admin || !['superadmin', 'admin'].includes(admin.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Get users with pending reset tokens
    const { data: tokens } = await supabaseAdmin
      .from('password_reset_tokens')
      .select('user_id, created_at')
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    const allIds = (tokens ?? []).map((t: any) => t.user_id);
    const pendingUserIds = allIds.filter((id: string, i: number) => allIds.indexOf(id) === i);
    const pendingMap: Record<string, string> = {};
    (tokens ?? []).forEach((t: any) => {
      if (!pendingMap[t.user_id]) pendingMap[t.user_id] = t.created_at;
    });

    return NextResponse.json({ pendingUserIds, pendingMap });
  } catch {
    // Table doesn't exist yet
    return NextResponse.json({ pendingUserIds: [], pendingMap: {} });
  }
}
