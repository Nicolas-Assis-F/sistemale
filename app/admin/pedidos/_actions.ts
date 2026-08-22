'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { OrderStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { generateOrderNumber, generateCustomerCode } from '@/lib/order-number';

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
  const code = await generateCustomerCode();
  const customer = await prisma.customer.create({
    data: {
      code,
      name: d.customerName.trim(),
      doc: d.customerDoc || null,
      email: d.customerEmail || null,
      phone: d.customerPhone || null,
      address: d.customerAddress || null,
      city: d.customerCity || null,
      state: d.customerState || null,
      zip: d.customerZip || null,
      contact: d.customerContact || null,
    },
  });
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

  const number = await generateOrderNumber();
  const order = await prisma.order.create({
    data: {
      number,
      customerId: customer.id,
      ...buildScalarData(d),
      items: { create: items },
    },
  });

  revalidatePath('/admin/pedidos');
  revalidatePath('/admin');
  redirect(`/admin/pedidos/${order.id}`);
}

export async function updateOrder(id: string, formData: FormData) {
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

  await prisma.order.update({
    where: { id },
    data: {
      customerId: customer.id,
      ...buildScalarData(d),
      items: { deleteMany: {}, create: items },
    },
  });

  revalidatePath('/admin/pedidos');
  revalidatePath(`/admin/pedidos/${id}`);
  revalidatePath('/admin');
  redirect(`/admin/pedidos/${id}`);
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  await prisma.order.update({ where: { id }, data: { status } });
  revalidatePath('/admin/pedidos');
  revalidatePath(`/admin/pedidos/${id}`);
  revalidatePath('/admin');
}

export async function deleteOrder(id: string) {
  try {
    await prisma.order.delete({ where: { id } });
  } catch {
    return { error: 'Não foi possível excluir o pedido. Tente novamente.' };
  }
  revalidatePath('/admin/pedidos');
  revalidatePath('/admin');
  redirect('/admin/pedidos');
}
