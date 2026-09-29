import { NextResponse } from 'next/server';
import { passwordMatches, setAuthCookie } from '@/lib/auth';
import { clearLoginFailures, loginBlockedFor, registerLoginFailure } from '@/lib/login-throttle';

export const runtime = 'nodejs';

function clientIp(req: Request) {
  return req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'desconhecido';
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  const blocked = loginBlockedFor(ip);
  if (blocked) {
    return NextResponse.json(
      { error: `Muitas tentativas. Tente de novo em ${Math.ceil(blocked / 60)} min.` },
      { status: 429, headers: { 'Retry-After': String(blocked) } },
    );
  }

  const body = await req.json().catch(() => ({}));
  const { password } = body as { password?: string };

  if (typeof password !== 'string' || password.length > 200 || !(await passwordMatches(password))) {
    registerLoginFailure(ip);
    console.warn(`[admin] login recusado (ip ${ip})`);
    // Atraso proposital: encarece tentativas em sequência
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));
    return NextResponse.json({ error: 'Senha incorreta.' }, { status: 401 });
  }

  clearLoginFailures(ip);
  try {
    await setAuthCookie();
  } catch (error) {
    console.error('[admin] sessão não criada:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Login indisponível: configuração do servidor incompleta.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
