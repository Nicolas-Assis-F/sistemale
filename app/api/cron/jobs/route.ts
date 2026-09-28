import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { runJobs } from '@/lib/infrastructure/jobs/runner';
import { jobHandlers } from '@/lib/infrastructure/jobs/handlers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get('authorization');
  if (!secret || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Recuperação da fila: executa jobs pendentes, com retry vencido ou com lease
 * expirado. A Vercel Cron chama com `Authorization: Bearer $CRON_SECRET`;
 * um monitor externo (ex.: o mesmo do /api/health) pode chamar com o mesmo header.
 */
export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const summary = await runJobs(jobHandlers, { budgetMs: 45_000 });
  return NextResponse.json({ ok: true, ...summary }, { headers: { 'Cache-Control': 'no-store' } });
}
