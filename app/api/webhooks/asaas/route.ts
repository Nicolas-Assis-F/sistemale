import crypto from 'node:crypto';
import { after, NextResponse } from 'next/server';
import { ASAAS_WEBHOOK_JOB, ingestAsaasWebhook, type AsaasWebhookBody } from '@/lib/integrations/asaas/webhook';
import { runJobs } from '@/lib/infrastructure/jobs/runner';
import { jobHandlers } from '@/lib/infrastructure/jobs/handlers';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_BODY_BYTES = 256 * 1024;

function tokenMatches(received: string | null) {
  const expected = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!expected || !received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Webhook de cobranças do Asaas. Configure no painel do Asaas:
 *   URL:   https://<seu-dominio>/api/webhooks/asaas
 *   Token: o mesmo valor de ASAAS_WEBHOOK_TOKEN (enviado no header asaas-access-token)
 *
 * Autentica → grava inbox + job na mesma transação → responde 2xx. O efeito
 * (baixa, recálculo, e-mail) roda depois, no job: primeiro via after(), e o
 * cron /api/cron/jobs recupera o que tiver ficado para trás. Se a gravação
 * falhar, responde 500 para o Asaas reenviar — nunca confirma sem persistir.
 */
export async function POST(req: Request) {
  if (!tokenMatches(req.headers.get('asaas-access-token'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const text = await req.text().catch(() => '');
  if (Buffer.byteLength(text) > MAX_BODY_BYTES) return NextResponse.json({ error: 'payload grande demais' }, { status: 413 });
  let body: Partial<AsaasWebhookBody> | null = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = null;
  }
  if (!body || typeof body.id !== 'string' || typeof body.event !== 'string') {
    return NextResponse.json({ error: 'payload inválido' }, { status: 400 });
  }

  let result: Awaited<ReturnType<typeof ingestAsaasWebhook>>;
  try {
    result = await ingestAsaasWebhook(body as AsaasWebhookBody);
  } catch (error) {
    console.error('[webhook asaas] falha ao persistir', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'falha ao registrar' }, { status: 500 });
  }

  after(() => runJobs(jobHandlers, { types: [ASAAS_WEBHOOK_JOB], budgetMs: 40_000 }).catch((e) => {
    console.error('[webhook asaas] execução adiada falhou; o cron retoma', e instanceof Error ? e.message : e);
  }));

  return NextResponse.json({ ok: true, duplicate: result.duplicate });
}
