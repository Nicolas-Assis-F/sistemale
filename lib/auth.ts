import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE, ADMIN_SESSION_SECONDS, createAdminToken, passwordMatches, verifyAdminToken } from './admin-session';

export { passwordMatches };

export async function setAuthCookie() {
  const store = await cookies();
  store.set(ADMIN_COOKIE, await createAdminToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' && process.env.AUTH_COOKIE_SECURE !== 'false',
    sameSite: 'strict',
    maxAge: ADMIN_SESSION_SECONDS,
    path: '/',
  });
}

export async function clearAuthCookie() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}

export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return verifyAdminToken(store.get(ADMIN_COOKIE)?.value);
}

/**
 * Guarda para páginas e Server Actions do painel. Server Actions são endpoints
 * POST públicos e as páginas não podem depender só do proxy: cada uma valida a
 * sessão por conta própria. Sem sessão → volta ao login.
 */
export async function requireAdmin() {
  if (!(await isAuthenticated())) redirect('/admin/login');
}
