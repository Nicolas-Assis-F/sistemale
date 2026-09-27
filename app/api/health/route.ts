import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Checagem de saúde: um monitor externo chama a cada 5 min e mantém o banco acordado. */
export async function GET() {
  const t = Date.now();
  try {
    await prisma.$queryRaw`select 1`;
    return NextResponse.json({ ok: true, dbMs: Date.now() - t }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
