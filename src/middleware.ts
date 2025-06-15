
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// List of paths that were previously protected or public for reference
// const protectedPaths = [
//   '/dashboard',
//   '/backlog',
//   '/sprints',
//   '/roadmap',
//   '/chat',
//   '/reports',
//   '/projects',
//   '/teams',
//   '/users',
// ];
// const publicPaths = ['/login', '/signup'];

export function middleware(request: NextRequest) {
  // For now, let all requests pass through.
  // Client-side auth checks in `useRequireAuth` and page-level logic will handle redirection.
  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

