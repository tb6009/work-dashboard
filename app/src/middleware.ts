import { auth } from '@/auth';
import { NextResponse } from 'next/server';

/** Routes that require authentication. The home page (/) stays public. */
const PROTECTED_PREFIXES = ['/daily', '/weekly', '/monthly', '/yearly', '/projects'];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(p => pathname.startsWith(p));
  if (!isProtected) return;          // public
  if (req.auth) return;              // logged in

  const url = new URL('/login', req.nextUrl.origin);
  url.searchParams.set('next', pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
});

export const config = {
  // exclude Next internals + auth API + static assets
  matcher: ['/((?!_next|api/auth|favicon.ico|.*\\..*).*)'],
};
