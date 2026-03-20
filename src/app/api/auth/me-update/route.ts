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
    const updates: Record<string, any> = {};

    // Avatar update (base64, max ~200kb)
    if ('avatar' in body) {
      if (body.avatar && body.avatar.length > 300_000) {
        return NextResponse.json({ error: 'Avatar too large (max ~200kb)' }, { status: 400 });
      }
      updates.avatar = body.avatar; // null to remove
    }

    // Password change (requires current password)
    if (body.newPassword) {
      if (!body.currentPassword) return NextResponse.json({ error: 'Current password required' }, { status: 400 });
      if (body.newPassword.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });

      // Verify current password
      const { data: dbUser } = await supabaseAdmin
        .from('users').select('password_hash').eq('id', user.id).single();
      if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

      const valid = await verifyPassword(body.currentPassword, dbUser.password_hash);
      if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });

      updates.password_hash = await hashPassword(body.newPassword);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('users').update(updates).eq('id', user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
