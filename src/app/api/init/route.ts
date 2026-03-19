import { NextRequest, NextResponse } from 'next/server';
import { initDatabase } from '@/lib/db/init';

export async function POST(req: NextRequest) {
  // Simple secret check to prevent unauthorized init
  const { secret } = await req.json().catch(() => ({}));
  if (secret !== process.env.JWT_SECRET?.slice(0, 16)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const result = await initDatabase();
  return NextResponse.json(result);
}

export async function GET() {
  const result = await initDatabase();
  return NextResponse.json(result);
}
