import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';
import { verifyAuthCookieEdge } from '@/lib/auth-edge';

/** Telas de acesso do cliente (abertas sem sessão). */
const CUSTOMER_PUBLIC = ['/conta/entrar', '/conta/cadastro', '/conta/esqueci-senha', '/conta/redefinir-senha'];

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // ─── Área do cliente: checagem otimista do cookie (a página valida a sessão de verdade)
  if (pathname.startsWith('/conta')) {
    if (CUSTOMER_PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next();
    if (!getSessionCookie(req, { cookiePrefix: 'le-cliente' })) {
      const url = new URL('/conta/entrar', req.url);
      url.searchParams.set('next', pathname + search);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // ─── Painel administrativo
  const isLoginPage = pathname === '/admin/login';
  const authed = await verifyAuthCookieEdge(req.cookies.get('admin_auth')?.value);

  // Já autenticado: a tela de login não deve renderizar dentro do layout do painel
  if (isLoginPage && authed) {
    return NextResponse.redirect(new URL('/admin', req.url));
  }

  if (!isLoginPage && !authed) {
    const url = new URL('/admin/login', req.url);
    if (pathname !== '/admin') url.searchParams.set('next', pathname + search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*', '/conta/:path*'] };
