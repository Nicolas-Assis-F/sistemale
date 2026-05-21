import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

const COOKIE_NAME = 'admin_auth';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 dias

function hmac(value: string): string {
  const secret = process.env.AUTH_COOKIE_SECRET!;
  return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

export function buildSignedCookieValue(token: string): string {
  const sig = hmac(token);
  return `${token}.${sig}`;
}

export function verifySignedCookieValue(value: string): boolean {
  const lastDot = value.lastIndexOf('.');
  if (lastDot === -1) return false;
  const token = value.slice(0, lastDot);
  const sig = value.slice(lastDot + 1);
  const expected = hmac(token);
  try {
    return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

export function verifyPassword(provided: string): boolean {
  const expected = process.env.ADMIN_PASSWORD!;
  if (provided.length !== expected.length) {
    // ainda executa para evitar timing leak
    crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(provided));
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

export async function setAuthCookie() {
  const token = crypto.randomBytes(32).toString('hex');
  const signed = buildSignedCookieValue(token);
  const store = await cookies();
  store.set(COOKIE_NAME, signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

export async function clearAuthCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export function verifyAuthCookieFromRequest(req: NextRequest): boolean {
  const value = req.cookies.get(COOKIE_NAME)?.value;
  if (!value) return false;
  return verifySignedCookieValue(value);
}

export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  if (!value) return false;
  return verifySignedCookieValue(value);
}
