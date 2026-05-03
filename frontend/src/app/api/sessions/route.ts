// /frontend/src/app/api/sessions/route.ts
import { NextRequest, NextResponse } from 'next/server';

const BACKEND = 'http://127.0.0.1:8002';

export async function GET(request: NextRequest) {
  const search = request.nextUrl.search;
  const url = `${BACKEND}/chat/sessions${search}`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
