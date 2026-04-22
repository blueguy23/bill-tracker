import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Rate limiter is optional — only active when Upstash env vars are set.
// Without them the app works normally; rate limiting is silently skipped.
// Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to enable.
const ratelimit =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(5, '15 m'),
        prefix: 'rl:login',
        analytics: false,
      })
    : null;

export default auth(async (req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === '/login';

  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', req.nextUrl.origin));
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL('/', req.nextUrl.origin));
  }

  // Rate limit login attempts — 5 per 15 minutes per IP
  if (ratelimit && req.method === 'POST' && isLoginPage) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'anonymous';
    const { success } = await ratelimit.limit(ip);
    if (!success) {
      return NextResponse.redirect(new URL('/login?error=rate-limited', req.nextUrl.origin));
    }
  }

  // Demo users are read-only — block all mutating API calls
  const isDemo = req.auth?.user?.name === 'Demo';
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  const isApiRoute = req.nextUrl.pathname.startsWith('/api/v1/');
  if (isDemo && isMutation && isApiRoute) {
    return NextResponse.json({ error: 'Demo mode — read only' }, { status: 403 });
  }
});

export const config = {
  matcher: [
    // Protect everything except NextAuth internals, static assets, and the health endpoint
    '/((?!api/auth|api/v1/health|_next/static|_next/image|favicon.ico).*)',
  ],
};
