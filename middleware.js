import { NextResponse } from 'next/server';
import { geolocation } from '@vercel/edge';
import { RateLimiterMemory } from 'rate-limiter-flexible';

const limiter = new RateLimiterMemory({
  points: 20, // 20 requests
  duration: 60, // per 60 seconds per IP
});

const ALLOWED_COUNTRIES = ['AU', 'NG'];
const BLOCKED_USER_AGENTS = ['curl', 'wget', 'bot', 'spider', 'crawl'];
const BLOCKED_IPS = ['123.456.789.000', '111.222.333.444']; // Add real IPs here

export async function middleware(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  const userAgent = request.headers.get('user-agent') || '';

  // IP blocking
  if (BLOCKED_IPS.includes(ip)) {
    return new Response('Forbidden: IP blocked', { status: 403 });
  }

  // Bot user-agent detection
  if (BLOCKED_USER_AGENTS.some(bot => userAgent.toLowerCase().includes(bot))) {
    return new Response('Forbidden: Bot detected', { status: 403 });
  }

  // JavaScript execution check (custom header injected by browser)
  if (!request.headers.get('x-js-enabled')) {
    return new Response('Forbidden: JS not enabled', { status: 403 });
  }

  // Geolocation check
  const geo = geolocation(request);
  const country = geo?.country || 'unknown';
  if (!ALLOWED_COUNTRIES.includes(country)) {
    return new Response(`Access denied from ${country}`, { status: 403 });
  }

  // Rate limiting
  try {
    await limiter.consume(ip);
  } catch (err) {
    return new Response('Too Many Requests', { status: 429 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/:path*',
};
