import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import type { AsaasPayment } from '@/lib/asaas';
import { applyAsaasPayment, findOrCreateLocalPayment } from '@/lib/orders/asaas-sync';

export const runtime = 'nodejs';

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
 * Entrega é at-least-once: o id do evento é persistido e nunca reprocessado.
 */
export async function POST(req: Request) {
  if (!tokenMatches(req.headers.get('asaas-access-token'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { id?: string; event?: string; payment?: AsaasPayment } | null;
  if (!body?.id || !body.event) return NextResponse.json({ error: 'payload inválido' }, { status: 400 });

  // Idempotência: se o evento já foi processado com sucesso, só confirma o recebimento
  const existing = await prisma.webhookEvent.findUnique({ where: { id: body.id } });
  if (existing?.processedAt) return NextResponse.json({ ok: true, duplicate: true });
  if (!existing) {
    await prisma.webhookEvent.create({
      data: { id: body.id, provider: 'asaas', event: body.event, payload: body as unknown as Prisma.InputJsonValue },
    }).catch(() => {}); // corrida entre entregas simultâneas: segue para o processamento
  }

  try {
    if (body.event.startsWith('PAYMENT_') && body.payment?.id) {
      const local = await findOrCreateLocalPayment(body.payment);
      // Cobranças criadas fora do sistema (sem externalReference nosso) são apenas registradas
      if (local) {
        const remote = body.event === 'PAYMENT_DELETED' ? { ...body.payment, deleted: true } : body.payment;
        await applyAsaasPayment(local.id, remote, 'asaas');
      }
    }
    await prisma.webhookEvent.update({ where: { id: body.id }, data: { processedAt: new Date(), error: null } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.webhookEvent.update({ where: { id: body.id }, data: { error: message.slice(0, 1000) } }).catch(() => {});
    // 500 → o Asaas reenvia depois (a fila pausa após 15 falhas seguidas)
    return NextResponse.json({ error: 'falha ao processar' }, { status: 500 });
  }
}
