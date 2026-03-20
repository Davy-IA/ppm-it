import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, getTokenFromRequest, hashPassword, verifyPassword } from '@/lib/db/auth';
import { supabaseAdmin } from '@/lib/db/supabase';

export async function PATCH(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await getSessionUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();

    // ── Avatar update ──
    if ('avatar' in body) {
      console.log('[me-update] avatar length:', body.avatar?.length ?? 0);
      if (body.avatar && body.avatar.length > 500_000) {
        return NextResponse.json({ error: 'Avatar too large (max 400kb)' }, { status: 400 });
      }
      // Try to update avatar — gracefully handle missing column
      const { error } = await supabaseAdmin
        .from('users')
        .update({ avatar: body.avatar })
        .eq('id', user.id);

      if (error) {
        // Column probably doesn't exist yet
        if (error.message?.includes('avatar') || error.code === '42703') {
          return NextResponse.json({
            error: 'migration_needed',
            message: 'La colonne avatar n\'existe pas encore. Merci de lancer la migration SQL dans Supabase.',
            sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;'
          }, { status: 422 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    // ── Password change ──
    if (body.newPassword) {
      if (!body.currentPassword) return NextResponse.json({ error: 'Current password required' }, { status: 400 });
      if (body.newPassword.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });

      const { data: dbUser } = await supabaseAdmin
        .from('users').select('password_hash').eq('id', user.id).single();
      if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

      const valid = await verifyPassword(body.currentPassword, dbUser.password_hash);
      if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });

      const hash = await hashPassword(body.newPassword);
      const { error } = await supabaseAdmin.from('users').update({ password_hash: hash }).eq('id', user.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  } catch (err) {
    console.error('me-update error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
