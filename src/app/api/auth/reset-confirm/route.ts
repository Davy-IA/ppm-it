import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';
import { hashPassword } from '@/lib/db/auth';

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();
    if (!token || !password) return NextResponse.json({ error: 'Token and password required' }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });

    // Find valid token
    const { data: resetToken } = await supabaseAdmin
      .from('password_reset_tokens')
      .select('id, user_id, expires_at, used')
      .eq('token', token)
      .single();

    if (!resetToken) return NextResponse.json({ error: 'Invalid or expired link' }, { status: 400 });
    if (resetToken.used) return NextResponse.json({ error: 'This link has already been used' }, { status: 400 });
    if (new Date(resetToken.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This link has expired. Please request a new one.' }, { status: 400 });
    }

    // Hash new password and update user
    const hash = await hashPassword(password);
    await supabaseAdmin.from('users').update({ password_hash: hash }).eq('id', resetToken.user_id);

    // Mark token as used
    await supabaseAdmin.from('password_reset_tokens').update({ used: true }).eq('id', resetToken.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Reset confirm error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// GET: validate token (check if still valid before showing form)
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ valid: false, error: 'No token' });

  const { data: resetToken } = await supabaseAdmin
    .from('password_reset_tokens')
    .select('id, expires_at, used, users(first_name, email)')
    .eq('token', token)
    .single();

  if (!resetToken || resetToken.used || new Date(resetToken.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, error: 'Invalid or expired link' });
  }

  return NextResponse.json({ valid: true, user: (resetToken as any).users });
}
