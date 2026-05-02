// /frontend/src/app/api/files/tree/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session_id') ?? 'default';
  try {
    const res = await fetch(
      `http://127.0.0.1:8002/files/tree?session_id=${encodeURIComponent(sessionId)}`,
      { cache: 'no-store' }
    );
    if (!res.ok) {
      return NextResponse.json({ error: `Backend error: ${res.status}` }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    console.error('[/api/files/tree] proxy error:', e);
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 });
  }
}
