import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'pemilu-osis-secret-jwt-key-2026-default'
);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const voterToken = request.cookies.get('voter_session')?.value;
  const adminToken = request.cookies.get('admin_session')?.value;

  // Protect /vote route
  if (pathname.startsWith('/vote')) {
    if (!voterToken) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    try {
      await jwtVerify(voterToken, SECRET_KEY);
    } catch {
      const response = NextResponse.redirect(new URL('/', request.url));
      response.cookies.delete('voter_session');
      return response;
    }
  }

  // Protect /admin routes (except /admin/login)
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!adminToken) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    try {
      const { payload } = await jwtVerify(adminToken, SECRET_KEY);
      if (payload.role !== 'admin') {
        return NextResponse.redirect(new URL('/', request.url));
      }
    } catch {
      const response = NextResponse.redirect(new URL('/', request.url));
      response.cookies.delete('admin_session');
      return response;
    }
  }

  // Redirect logged-in users away from login pages (/ and /login)
  if (pathname === '/' || pathname === '/login') {
    if (adminToken) {
      try {
        const { payload } = await jwtVerify(adminToken, SECRET_KEY);
        if (payload.role === 'admin') {
          return NextResponse.redirect(new URL('/admin/dashboard', request.url));
        }
      } catch {
        // Token invalid, clear it
      }
    }

    if (voterToken) {
      try {
        await jwtVerify(voterToken, SECRET_KEY);
        return NextResponse.redirect(new URL('/vote', request.url));
      } catch {
        // Token invalid, clear it
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/vote/:path*', '/', '/login', '/admin/:path*'],
};
