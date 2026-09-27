// Emissão de cobranças no Asaas (server-only, NÃO é Server Action).
import type { Customer, PaymentMethod } from '@prisma/client';
import { prisma } from '@/lib/db';
import {
  METHOD_TO_BILLING, createAsaasCustomer, createAsaasPayment, getAsaasPixQrCode, mapAsaasStatus, toCents,
} from '@/lib/asaas';

/** Garante o cliente no Asaas (cria na 1ª cobrança e guarda o id). */
export async function ensureAsaasCustomer(c: Customer) {
  if (c.asaasCustomerId) return c.asaasCustomerId;
  const created = await createAsaasCustomer({
    name: c.name, cpfCnpj: c.doc!, email: c.email, mobilePhone: c.phone, postalCode: c.zip, externalReference: c.id,
  });
  await prisma.customer.update({ where: { id: c.id }, data: { asaasCustomerId: created.id } });
  return created.id;
}

/**
 * Cria o registro local e a cobrança no Asaas. Se o Asaas recusar, o registro
 * local é descartado e o erro sobe; se aceitar, o registro nunca é apagado.
 */
export async function issueAsaasCharge(args: {
  orderId: string;
  asaasCustomerId: string;
  method: PaymentMethod;
  amountCents: number;
  dueDate: string;
  description: string;
  installmentCount?: number;
  finePercent?: number;
  interestPercent?: number;
  planId?: string;
  planLabel?: string;
}) {
  const payment = await prisma.payment.create({
    data: {
      orderId: args.orderId,
      provider: 'ASAAS',
      method: args.method,
      amountCents: args.amountCents,
      dueDate: new Date(`${args.dueDate}T12:00:00`),
      description: args.description,
      installmentCount: args.installmentCount && args.installmentCount > 1 ? args.installmentCount : null,
      finePercent: args.finePercent ?? null,
      interestPercent: args.interestPercent ?? null,
      planId: args.planId ?? null,
      planLabel: args.planLabel ?? null,
    },
  });

  let remote: Awaited<ReturnType<typeof createAsaasPayment>>;
  try {
    remote = await createAsaasPayment({
      customer: args.asaasCustomerId,
      billingType: METHOD_TO_BILLING[args.method]!,
      amountCents: args.amountCents,
      dueDate: args.dueDate,
      description: args.description,
      externalReference: payment.id,
      installmentCount: args.installmentCount,
      finePercent: args.finePercent,
      interestPercent: args.interestPercent,
    });
  } catch (error) {
    await prisma.payment.delete({ where: { id: payment.id } }).catch(() => {});
    throw error;
  }

  // Boleto do Asaas também aceita PIX: guarda o QR/copia-e-cola quando houver
  const pix = remote.billingType !== 'CREDIT_CARD' ? await getAsaasPixQrCode(remote.id).catch(() => null) : null;
  return prisma.payment.update({
    where: { id: payment.id },
    data: {
      externalId: remote.id,
      amountCents: toCents(remote.value),
      status: mapAsaasStatus(remote.status, remote.deleted),
      invoiceUrl: remote.invoiceUrl ?? null,
      bankSlipUrl: remote.bankSlipUrl ?? null,
      pixPayload: pix?.payload ?? null,
      pixQrImage: pix?.encodedImage ?? null,
      lastSyncedAt: new Date(),
    },
  });
}
