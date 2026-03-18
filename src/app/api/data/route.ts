import { NextRequest, NextResponse } from 'next/server';
import { AppData } from '@/types';
import { INITIAL_DATA } from '@/lib/data';

// In-memory store (for Vercel serverless - use Vercel KV or Upstash Redis for production persistence)
// This resets on cold start. For multi-user persistence, connect a real DB.
let store: AppData = JSON.parse(JSON.stringify(INITIAL_DATA));

export async function GET() {
  return NextResponse.json(store);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    store = body as AppData;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }
}
