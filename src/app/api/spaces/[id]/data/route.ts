import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, getTokenFromRequest } from '@/lib/db/auth';
import { supabaseAdmin } from '@/lib/db/supabase';
import { INITIAL_DATA } from '@/lib/data';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await getSessionUser(token);
  if (!user || !user.spaceIds.includes(params.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data } = await supabaseAdmin
    .from('space_data')
    .select('data')
    .eq('space_id', params.id)
    .single();

  return NextResponse.json(data?.data ?? INITIAL_DATA);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await getSessionUser(token);
  if (!user || !user.spaceIds.includes(params.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  await supabaseAdmin.from('space_data').upsert(
    { space_id: params.id, data: body, updated_at: new Date().toISOString() },
    { onConflict: 'space_id' }
  );

  return NextResponse.json({ ok: true });
}
