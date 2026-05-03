// /frontend/src/app/api/sessions/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';

const BACKEND = 'http://127.0.0.1:8002';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const pathSegments = params.path.join('/');
  const search = request.nextUrl.search;
  const url = `${BACKEND}/chat/sessions/${pathSegments}${search}`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
