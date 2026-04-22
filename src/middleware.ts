import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === '/login';

  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', req.nextUrl.origin));
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL('/', req.nextUrl.origin));
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
