import { NextRequest, NextResponse } from 'next/server';
import { GanttPhase } from '@/types';

let store: Record<string, GanttPhase[]> = {};

export async function GET() {
  return NextResponse.json(store);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    store = body;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }
}
