import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

// Public paths that don't require authentication
const publicPaths = [
  '/api/auth/verify',  // Allow login
];

// API paths that require authentication
const protectedApiPaths = [
  '/api/status',
  '/api/endpoints',
  '/api/day-detail',
  '/api/scheduler',
  '/api/test-slack',
  '/api/auth/check',
  '/api/auth/logout',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public API paths
  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  // Get token from cookies
  const token = request.cookies.get('loft-auth-token')?.value;

  // Check if path requires authentication
  const isProtectedApi = protectedApiPaths.some(path => pathname.startsWith(path));
  const isPageRoute = !pathname.startsWith('/api') && !pathname.startsWith('/_next') && !pathname.includes('.');

  if (isProtectedApi || isPageRoute) {
    // Verify token
    if (!token) {
      if (isProtectedApi) {
        return NextResponse.json(
          { error: 'Unauthorized - No token provided' },
          { status: 401 }
        );
      }
      // For page routes, let them through - AuthContext will handle showing modal
      return NextResponse.next();
    }

    // Verify token is valid
    const isValid = await verifyToken(token);
    if (!isValid) {
      if (isProtectedApi) {
        // Clear invalid token and return 401
        const response = NextResponse.json(
          { error: 'Unauthorized - Invalid token' },
          { status: 401 }
        );
        response.cookies.delete('loft-auth-token');
        return response;
      }
      // For page routes, let them through - AuthContext will handle showing modal
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.svg).*)',
  ],
};
