import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, getTokenFromRequest, hashPassword } from '@/lib/db/auth';
import { supabaseAdmin } from '@/lib/db/supabase';

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await getSessionUser(token);
  if (!user || !['superadmin', 'admin'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, email, first_name, last_name, role, active, last_login, created_at')
    .order('created_at');

  // Get space memberships
  const { data: memberships } = await supabaseAdmin
    .from('user_spaces')
    .select('user_id, space_id, spaces(id, name, color)');

  const usersWithSpaces = (users ?? []).map((u: any) => ({
    ...u,
    spaces: (memberships ?? []).filter((m: any) => m.user_id === u.id).map((m: any) => m.spaces),
  }));

  return NextResponse.json({ users: usersWithSpaces });
}

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const actor = await getSessionUser(token);
  if (!actor || !['superadmin', 'admin'].includes(actor.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();

  // Only superadmin can create other admins/superadmins
  if (['superadmin', 'admin'].includes(body.role) && actor.role !== 'superadmin') {
    return NextResponse.json({ error: 'Only superadmin can create admin users' }, { status: 403 });
  }
  // admin and superadmin can create space_admin; regular admin cannot escalate beyond space_admin
  if (body.role === 'space_admin' && !['superadmin', 'admin'].includes(actor.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const hash = await hashPassword(body.password);
  const { data: newUser, error } = await supabaseAdmin
    .from('users')
    .insert({
      email: body.email.toLowerCase(),
      password_hash: hash,
      first_name: body.firstName,
      last_name: body.lastName,
      role: body.role,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Assign spaces
  if (body.spaceIds?.length) {
    await supabaseAdmin.from('user_spaces').insert(
      body.spaceIds.map((sid: string) => ({ user_id: newUser.id, space_id: sid }))
    );
  }

  return NextResponse.json({ user: newUser });
}

export async function PUT(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const actor = await getSessionUser(token);
  if (!actor || !['superadmin', 'admin'].includes(actor.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const updates: any = {
    first_name: body.firstName,
    last_name: body.lastName,
    role: body.role,
    active: body.active,
  };
  if (body.password) updates.password_hash = await hashPassword(body.password);

  await supabaseAdmin.from('users').update(updates).eq('id', body.id);

  // Update space memberships
  if (body.spaceIds !== undefined) {
    await supabaseAdmin.from('user_spaces').delete().eq('user_id', body.id);
    if (body.spaceIds.length) {
      await supabaseAdmin.from('user_spaces').insert(
        body.spaceIds.map((sid: string) => ({ user_id: body.id, space_id: sid }))
      );
    }
  }

  return NextResponse.json({ ok: true });
}
