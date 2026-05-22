import { NextRequest, NextResponse } from 'next/server';

const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX ?? '30', 10);
const WINDOW_MS = 60_000;

const buckets = new Map<string, { count: number; resetAt: number }>();

function getIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
}

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === '/api/health') {
    return NextResponse.next();
  }

  if (!req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const ip = getIp(req);
  const now = Date.now();
  const bucket = buckets.get(ip);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return NextResponse.next();
  }

  if (bucket.count >= RATE_LIMIT_MAX) {
    return new NextResponse(
      JSON.stringify({ error: 'Too many requests', code: 'RATE_LIMITED' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '60',
        },
      }
    );
  }

  bucket.count++;
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
