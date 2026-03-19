import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, getTokenFromRequest } from '@/lib/db/auth';
import { supabaseAdmin } from '@/lib/db/supabase';

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await getSessionUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: spaces } = await supabaseAdmin
    .from('spaces')
    .select('*')
    .in('id', user.spaceIds)
    .eq('active', true)
    .order('name');

  return NextResponse.json({ spaces: spaces ?? [] });
}

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await getSessionUser(token);
  if (!user || !['superadmin', 'admin'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { data, error } = await supabaseAdmin
    .from('spaces')
    .insert({ name: body.name, description: body.description, color: body.color, icon: body.icon })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Init empty space data
  await supabaseAdmin.from('space_data').insert({
    space_id: data.id,
    data: { projects: [], staff: [], workloads: [], allocations: [], ganttPhases: [] }
  });

  return NextResponse.json({ space: data });
}
