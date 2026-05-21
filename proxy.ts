import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAuthCookieEdge } from '@/lib/auth-edge';

export async function proxy(req: NextRequest) {
  const isAdminPath = req.nextUrl.pathname.startsWith('/admin');
  const isLoginPage = req.nextUrl.pathname === '/admin/login';

  if (isAdminPath && !isLoginPage) {
    const cookieValue = req.cookies.get('admin_auth')?.value;
    if (!(await verifyAuthCookieEdge(cookieValue))) {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }
  }

  return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*'] };
