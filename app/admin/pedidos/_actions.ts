'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { OrderStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { generateOrderNumber, generateCustomerCode, withUniqueRetry } from '@/lib/order-number';
import { computeCommission, logOrderEvent, recalcOrder } from '@/lib/orders/ledger';
import { ORDER_STATUS_LABELS } from '@/lib/order-status';
import { formatBps } from '@/lib/finance-labels';
import { notifyQuoteReady } from '@/lib/orders/notify';
import { requireAdmin } from '@/lib/auth';

const itemSchema = z.object({
  productId: z.string().nullish(),
  name: z.string().min(1),
  description: z.string().nullish(),
  quantity: z.coerce.number().int().min(1).default(1),
  unitPriceCents: z.coerce.number().int().min(0).default(0),
  icmsPercent: z.coerce.number().int().min(0).max(100).default(0),
});

const orderSchema = z.object({
  customerId: z.string().optional().or(z.literal('')),
  // dados para criar cliente inline (quando não há customerId)
  customerName: z.string().optional().or(z.literal('')),
  customerDoc: z.string().optional().or(z.literal('')),
  customerEmail: z.string().optional().or(z.literal('')),
  customerPhone: z.string().optional().or(z.literal('')),
  customerAddress: z.string().optional().or(z.literal('')),
  customerCity: z.string().optional().or(z.literal('')),
  customerState: z.string().optional().or(z.literal('')),
  customerZip: z.string().optional().or(z.literal('')),
  customerContact: z.string().optional().or(z.literal('')),

  clientRef: z.string().optional().or(z.literal('')),
  status: z.nativeEnum(OrderStatus).default(OrderStatus.ORCAMENTO),
  employeeId: z.string().optional().or(z.literal('')),
  paymentTerms: z.string().optional().or(z.literal('')),
  paymentMethod: z.string().optional().or(z.literal('')),
  deliveryDate: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  items: z.string().transform((v) => JSON.parse(v) as unknown[]),
});

type OrderData = z.infer<typeof orderSchema>;

async function resolveCustomerId(d: OrderData): Promise<{ id: string } | { error: Record<string, string[]> }> {
  if (d.customerId) return { id: d.customerId };
  if (!d.customerName?.trim()) {
    return { error: { customerName: ['Selecione um cliente ou informe o nome'] } };
  }
  const name = d.customerName.trim();
  const customer = await withUniqueRetry(async () => prisma.customer.create({
    data: {
      code: await generateCustomerCode(),
      name,
      doc: d.customerDoc || null,
      email: d.customerEmail || null,
      phone: d.customerPhone || null,
      address: d.customerAddress || null,
      city: d.customerCity || null,
      state: d.customerState || null,
      zip: d.customerZip || null,
      contact: d.customerContact || null,
    },
  }));
  return { id: customer.id };
}

function buildScalarData(d: OrderData) {
  return {
    status: d.status,
    clientRef: d.clientRef || null,
    employeeId: d.employeeId || null,
    paymentTerms: d.paymentTerms || null,
    paymentMethod: d.paymentMethod || null,
    deliveryDate: d.deliveryDate ? new Date(d.deliveryDate) : null,
    notes: d.notes || null,
  };
}

function buildItems(rawItems: unknown[]) {
  return rawItems.map((raw, i) => {
    const item = itemSchema.parse(raw);
    return {
      productId: item.productId || null,
      name: item.name,
      description: item.description || null,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      icmsPercent: item.icmsPercent,
      position: i,
    };
  });
}

export async function createOrder(formData: FormData) {
  await requireAdmin();
  const parsed = orderSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  const d = parsed.data;
  if (d.items.length === 0) return { error: { items: ['Adicione ao menos um item'] } };

  const customer = await resolveCustomerId(d);
  if ('error' in customer) return { error: customer.error };

  let items: ReturnType<typeof buildItems>;
  try {
    items = buildItems(d.items);
  } catch {
    return { error: { items: ['Erro ao processar os itens do pedido'] } };
  }

  const order = await withUniqueRetry(async () => prisma.order.create({
    data: {
      number: await generateOrderNumber(),
      customerId: customer.id,
      ...buildScalarData(d),
      items: { create: items },
    },
  }));
  await logOrderEvent(prisma, order.id, 'CREATED', `Pedido ${order.number} criado como ${ORDER_STATUS_LABELS[order.status]}`);
  await syncResponsibleCommission(order.id, order.employeeId);
  await recalcOrder(order.id, 'admin');

  revalidatePath('/admin/pedidos');
  revalidatePath('/admin');
  redirect(`/admin/pedidos/${order.id}`);
}

export async function updateOrder(id: string, formData: FormData) {
  await requireAdmin();
  const parsed = orderSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  const d = parsed.data;
  if (d.items.length === 0) return { error: { items: ['Adicione ao menos um item'] } };

  const customer = await resolveCustomerId(d);
  if ('error' in customer) return { error: customer.error };

  let items: ReturnType<typeof buildItems>;
  try {
    items = buildItems(d.items);
  } catch {
    return { error: { items: ['Erro ao processar os itens do pedido'] } };
  }

  const before = await prisma.order.findUnique({ where: { id }, select: { status: true, source: true, totalCents: true } });
  const scalar = buildScalarData(d);
  await prisma.order.update({
    where: { id },
    data: {
      customerId: customer.id,
      ...scalar,
      items: { deleteMany: {}, create: items },
    },
  });
  await logOrderEvent(prisma, id, 'UPDATED', 'Pedido editado (itens e dados comerciais)');
  if (before && before.status !== scalar.status) {
    await logOrderEvent(prisma, id, 'STATUS', `Status: ${ORDER_STATUS_LABELS[before.status]} → ${ORDER_STATUS_LABELS[scalar.status]}`);
  }
  await syncResponsibleCommission(id, scalar.employeeId);
  const after = await recalcOrder(id, 'admin');
  // Orçamento pedido pelo site que acabou de receber preço: avisa o cliente
  if (before?.source === 'SITE' && before.totalCents === 0 && after.totalCents > 0) {
    await logOrderEvent(prisma, id, 'NOTE', 'Cliente avisado por e-mail: orçamento pronto');
    await notifyQuoteReady(id, after.totalCents);
  }

  revalidatePath('/admin/pedidos');
  revalidatePath(`/admin/pedidos/${id}`);
  revalidatePath('/admin');
  redirect(`/admin/pedidos/${id}`);
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  await requireAdmin();
  const before = await prisma.order.findUnique({ where: { id }, select: { status: true } });
  if (!before || before.status === status) return;
  await prisma.order.update({ where: { id }, data: { status } });
  await logOrderEvent(prisma, id, 'STATUS', `Status: ${ORDER_STATUS_LABELS[before.status]} → ${ORDER_STATUS_LABELS[status]}`);
  await recalcOrder(id, 'admin'); // cancelar/reativar ajusta as comissões
  revalidatePath('/admin/comissoes');
  revalidatePath('/admin/pedidos');
  revalidatePath(`/admin/pedidos/${id}`);
  revalidatePath('/admin');
}

export async function deleteOrder(id: string) {
  await requireAdmin();
  // Pedido com dinheiro envolvido não some: o histórico financeiro precisa ficar
  const [payments, paidCommissions] = await Promise.all([
    prisma.payment.count({ where: { orderId: id, status: { not: 'CANCELADO' } } }),
    prisma.commission.count({ where: { orderId: id, status: 'PAGA' } }),
  ]);
  if (payments || paidCommissions) {
    return { error: 'Este pedido tem cobranças ou comissões pagas. Altere o status para Cancelado em vez de excluir.' };
  }
  try {
    await prisma.payment.deleteMany({ where: { orderId: id } }); // só cobranças canceladas
    await prisma.order.delete({ where: { id } });
  } catch {
    return { error: 'Não foi possível excluir o pedido. Tente novamente.' };
  }
  revalidatePath('/admin/pedidos');
  revalidatePath('/admin');
  redirect('/admin/pedidos');
}

/**
 * O "Responsável" do pedido recebe comissão de produção automaticamente quando
 * o cadastro dele tem percentual padrão > 0 (não sobrescreve ajustes manuais).
 */
async function syncResponsibleCommission(orderId: string, employeeId: string | null) {
  if (!employeeId) return;
  const employee = await prisma.employee.findUnique({ where: { id: employeeId }, select: { name: true, commissionBps: true, payType: true } });
  // Assalariado (sem comissão) não gera comissão automática
  if (!employee?.commissionBps || employee.payType === 'SALARIO') return;
  const exists = await prisma.commission.findUnique({
    where: { orderId_employeeId_role: { orderId, employeeId, role: 'PRODUCAO' } },
  });
  if (exists) return;
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, select: { totalCents: true } });
  await prisma.commission.create({
    data: {
      orderId, employeeId, role: 'PRODUCAO', bps: employee.commissionBps,
      baseCents: order.totalCents, amountCents: computeCommission(order.totalCents, employee.commissionBps),
    },
  });
  await logOrderEvent(prisma, orderId, 'COMMISSION', `Comissão de produção para ${employee.name}: ${formatBps(employee.commissionBps)} (padrão do cadastro)`);
}
