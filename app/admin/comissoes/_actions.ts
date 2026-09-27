'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { CommissionRole } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { formatCurrency } from '@/lib/format';
import { COMMISSION_ROLE_LABELS, formatBps, parsePercentToBps } from '@/lib/finance-labels';
import { computeCommission, logOrderEvent, recalcOrder } from '@/lib/orders/ledger';
import { earnsCommission } from '@/lib/finance-categories';

type Result = { ok: true; message?: string } | { error: string };

function refresh(orderId?: string) {
  if (orderId) revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath('/admin/financeiro');
  revalidatePath('/admin/comissoes');
  revalidatePath('/admin/funcionarios');
}

const addSchema = z.object({
  employeeId: z.string().min(1, 'Selecione o funcionário'),
  role: z.nativeEnum(CommissionRole),
  percent: z.string().min(1, 'Informe o percentual'),
});

/** Vincula um funcionário ao pedido com um percentual de comissão sobre o total. */
export async function addOrderCommission(orderId: string, formData: FormData): Promise<Result> {
  await requireAdmin();
  const parsed = addSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  const bps = parsePercentToBps(parsed.data.percent);
  if (bps === null) return { error: 'Percentual inválido (use de 0 a 100).' };

  const [order, employee] = await Promise.all([
    prisma.order.findUnique({ where: { id: orderId }, select: { totalCents: true, status: true } }),
    prisma.employee.findUnique({ where: { id: parsed.data.employeeId }, select: { name: true, payType: true } }),
  ]);
  if (!order || !employee) return { error: 'Pedido ou funcionário não encontrado.' };
  if (order.status === 'CANCELADO') return { error: 'Pedido cancelado não gera comissão.' };
  if (!earnsCommission(employee.payType)) return { error: `${employee.name} recebe só salário. Altere a remuneração no cadastro para incluir comissão.` };

  try {
    await prisma.commission.create({
      data: {
        orderId, employeeId: parsed.data.employeeId, role: parsed.data.role, bps,
        baseCents: order.totalCents, amountCents: computeCommission(order.totalCents, bps),
      },
    });
  } catch {
    return { error: 'Este funcionário já tem comissão com essa função neste pedido.' };
  }
  await logOrderEvent(prisma, orderId, 'COMMISSION', `Comissão de ${COMMISSION_ROLE_LABELS[parsed.data.role].toLowerCase()} para ${employee.name}: ${formatBps(bps)}`);
  await recalcOrder(orderId, 'admin'); // já libera se o pedido estiver pago
  refresh(orderId);
  return { ok: true, message: 'Comissão adicionada.' };
}

export async function removeCommission(id: string): Promise<Result> {
  await requireAdmin();
  const c = await prisma.commission.findUnique({ where: { id }, include: { employee: { select: { name: true } } } });
  if (!c) return { error: 'Comissão não encontrada.' };
  if (c.status === 'PAGA') return { error: 'Comissão já paga não pode ser removida.' };
  await prisma.commission.delete({ where: { id } });
  await logOrderEvent(prisma, c.orderId, 'COMMISSION', `Comissão de ${c.employee.name} removida`);
  refresh(c.orderId);
  return { ok: true, message: 'Comissão removida.' };
}

/** Libera para pagamento antes da quitação (ex.: venda a prazo com promissória). */
export async function releaseCommission(id: string): Promise<Result> {
  await requireAdmin();
  const c = await prisma.commission.findUnique({ where: { id }, include: { employee: { select: { name: true } } } });
  if (!c || c.status !== 'PENDENTE') return { error: 'Só comissões pendentes podem ser liberadas.' };
  await prisma.commission.update({ where: { id }, data: { status: 'LIBERADA', releasedAt: new Date() } });
  await logOrderEvent(prisma, c.orderId, 'COMMISSION', `Comissão de ${c.employee.name} liberada manualmente · ${formatCurrency(c.amountCents)}`);
  refresh(c.orderId);
  return { ok: true, message: 'Comissão liberada para pagamento.' };
}

const paySchema = z.object({
  method: z.string().max(60).optional().or(z.literal('')),
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data do pagamento'),
  notes: z.string().max(300).optional().or(z.literal('')),
  ids: z.string().optional().or(z.literal('')), // ids separados por vírgula; vazio = todas liberadas
});

/** Registra o pagamento das comissões liberadas de um funcionário (gera um comprovante interno). */
export async function payEmployeeCommissions(employeeId: string, formData: FormData): Promise<Result> {
  await requireAdmin();
  const parsed = paySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  const ids = parsed.data.ids ? parsed.data.ids.split(',').filter(Boolean) : undefined;

  const due = await prisma.commission.findMany({
    where: { employeeId, status: 'LIBERADA', ...(ids ? { id: { in: ids } } : {}) },
    select: { id: true, orderId: true, amountCents: true },
  });
  if (!due.length) return { error: 'Nenhuma comissão liberada para pagar.' };
  const amountCents = due.reduce((s, c) => s + c.amountCents, 0);
  const paidAt = new Date(`${parsed.data.paidAt}T12:00:00`);

  await prisma.$transaction(async (tx) => {
    const payout = await tx.commissionPayout.create({
      data: { employeeId, amountCents, paidAt, method: parsed.data.method || null, notes: parsed.data.notes || null },
    });
    // Todo pagamento de comissão entra no financeiro como despesa paga
    const employee = await tx.employee.findUniqueOrThrow({ where: { id: employeeId }, select: { name: true } });
    await tx.financeEntry.create({
      data: {
        type: 'DESPESA', category: 'COMISSOES', status: 'PAGO',
        description: `Comissões — ${employee.name} (${due.length} pedido(s))`,
        amountCents, dueDate: paidAt, paidAt, competence: parsed.data.paidAt.slice(0, 7),
        method: parsed.data.method || null, notes: parsed.data.notes || null,
        employeeId, payoutId: payout.id,
      },
    });
    await tx.commission.updateMany({
      where: { id: { in: due.map((c) => c.id) }, status: 'LIBERADA' },
      data: { status: 'PAGA', paidAt, payoutId: payout.id },
    });
    for (const orderId of new Set(due.map((c) => c.orderId))) {
      await logOrderEvent(tx, orderId, 'COMMISSION', `Comissão paga ao funcionário (${formatCurrency(amountCents)} no lote)`);
    }
  });
  refresh();
  return { ok: true, message: `Pagamento de ${formatCurrency(amountCents)} registrado.` };
}
