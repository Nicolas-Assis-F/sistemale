import { NextResponse } from 'next/server';
import { verifyPassword, setAuthCookie } from '@/lib/auth';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { password } = body as { password?: string };

  if (!password || !verifyPassword(password)) {
    return NextResponse.json({ error: 'Senha incorreta.' }, { status: 401 });
  }

  await setAuthCookie();
  return NextResponse.json({ ok: true });
}
