import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, getTokenFromRequest } from '@/lib/db/auth';
import { supabaseAdmin } from '@/lib/db/supabase';

// Public endpoint — returns only branding (no auth needed for login screen)
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  const publicOnly = req.nextUrl.searchParams.get('public') === '1';

  // Public branding — no auth needed
  if (publicOnly || !token) {
    const { data } = await supabaseAdmin
      .from('app_settings')
      .select('key, value')
      .in('key', ['general']);
    const settings: Record<string, any> = {};
    (data ?? []).forEach((row: any) => { settings[row.key] = row.value; });
    // Return only safe public fields
    const general = settings.general ?? {};
    return NextResponse.json({
      appName: general.appName ?? 'PPM',
      logo: general.logo ?? null,
      logoDark: general.logoDark ?? null,
      colorTheme: general.colorTheme ?? 'indigo',
    });
  }

  const user = await getSessionUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabaseAdmin.from('app_settings').select('key, value');
  const settings: Record<string, any> = {};
  (data ?? []).forEach((row: any) => { settings[row.key] = row.value; });
  return NextResponse.json(settings);
}

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await getSessionUser(token);
  if (!user || !['superadmin', 'admin'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  for (const [key, value] of Object.entries(body)) {
    await supabaseAdmin.from('app_settings').upsert(
      { key, value, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );
  }
  return NextResponse.json({ ok: true });
}
