import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from './supabase';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'fallback-secret-change-in-production'
);
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export type UserRole = 'superadmin' | 'admin' | 'global' | 'member' | 'space_admin';

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  spaceIds: string[];
  avatar?: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.sub as string;
  } catch {
    return null;
  }
}

export async function getSessionUser(token: string): Promise<SessionUser | null> {
  const userId = await verifyToken(token);
  if (!userId) return null;

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, email, first_name, last_name, role, active, avatar')
    .eq('id', userId)
    .eq('active', true)
    .single();

  if (!user) return null;

  // Get space access
  let spaceIds: string[] = [];
  if (user.role === 'superadmin' || user.role === 'admin' || user.role === 'global') {
    // Full access — get all spaces
    const { data: spaces } = await supabaseAdmin.from('spaces').select('id').eq('active', true);
    spaceIds = (spaces ?? []).map((s: any) => s.id);
  } else {
    // member and space_admin: only assigned spaces
    const { data: memberships } = await supabaseAdmin
      .from('user_spaces')
      .select('space_id')
      .eq('user_id', userId);
    spaceIds = (memberships ?? []).map((m: any) => m.space_id);
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    role: user.role,
    spaceIds,
    avatar: user.avatar ?? undefined,
  };
}

export async function loginUser(email: string, password: string): Promise<{ token: string; user: SessionUser } | null> {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .eq('active', true)
    .single();

  if (!user) return null;

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) return null;

  // Update last login
  await supabaseAdmin.from('users').update({ last_login: new Date().toISOString() }).eq('id', user.id);

  const token = await createToken(user.id);

  let spaceIds: string[] = [];
  if (['superadmin', 'admin', 'global'].includes(user.role)) {
    const { data: spaces } = await supabaseAdmin.from('spaces').select('id').eq('active', true);
    spaceIds = (spaces ?? []).map((s: any) => s.id);
  } else {
    // member and space_admin: only assigned spaces
    const { data: memberships } = await supabaseAdmin
      .from('user_spaces').select('space_id').eq('user_id', user.id);
    spaceIds = (memberships ?? []).map((m: any) => m.space_id);
  }

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      spaceIds,
      avatar: user.avatar ?? undefined,
    },
  };
}

export function getTokenFromRequest(req: Request): string | null {
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  const cookie = req.headers.get('cookie');
  if (cookie) {
    const match = cookie.match(/ppm_token=([^;]+)/);
    if (match) return match[1];
  }
  return null;
}
