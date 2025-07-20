import { NextResponse } from 'next/server';
import { RateLimiterMemory } from 'rate-limiter-flexible';

const limiter = new RateLimiterMemory({
  points: 20,
  duration: 60,
});

const ALLOWED_COUNTRIES = ['AU', 'NG'];
const BLOCKED_USER_AGENTS = ['curl', 'wget', 'bot', 'spider', 'crawl'];
const BLOCKED_IPS = ['123.456.789.000'];

export async function middleware(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  const userAgent = request.headers.get('user-agent') || '';
  const url = request.nextUrl.pathname;

  // ✅ 0. Skip middleware for internal API route
  if (request.nextUrl.pathname.startsWith('/api/js-check')) {
  return NextResponse.next(); // skip middleware for this API route
}

  // 1. Block by IP
  if (BLOCKED_IPS.includes(ip)) {
    return new Response('Forbidden: IP blocked', { status: 403 });
  }

  // 2. Block by User-Agent
  if (BLOCKED_USER_AGENTS.some(bot => userAgent.toLowerCase().includes(bot))) {
    return new Response('Forbidden: Bot detected', { status: 403 });
  }

  // 3. Check if JS is enabled
  if (!request.headers.get('x-js-enabled')) {
    return new Response('Forbidden: JavaScript required', { status: 403 });
  }

  // 4. Country block
  const country = request.geo?.country || 'unknown';
  if (!ALLOWED_COUNTRIES.includes(country)) {
    return new Response(`Access denied from ${country}`, { status: 403 });
  }

  // 5. Rate limiting
  try {
    await limiter.consume(ip);
  } catch {
    return new Response('Too Many Requests', { status: 429 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/:path*',
};
