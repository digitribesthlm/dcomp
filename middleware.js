import { NextResponse } from 'next/server'

export function middleware(request) {
  // Public paths that don't require authentication
  const publicPaths = ['/login', '/api/auth/login']
  const pathname = request.nextUrl.pathname
  
  // Allow public paths
  if (publicPaths.includes(pathname)) {
    return NextResponse.next()
  }
  
  // Check for authentication token
  const token = request.cookies.get('auth-token')?.value
  
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  // For production, we'll verify the token on the server side
  // This middleware just checks if token exists
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (authentication endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login (login page)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|login).*)',
  ],
}

