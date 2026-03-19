import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/lib/db/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });

    const result = await loginUser(email, password);
    if (!result) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    const res = NextResponse.json({ user: result.user, token: result.token });
    res.cookies.set('ppm_token', result.token, {
      httpOnly: true, secure: true, sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, path: '/',
    });
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
