import { prisma } from './db';

function yearMonth(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${yy}${mm}`;
}

/** Gera o número do pedido no formato SO{AAMM}-NNNN (sequência mensal). */
export async function generateOrderNumber(): Promise<string> {
  const ym = yearMonth();
  const prefix = `SO${ym}-`;
  const count = await prisma.order.count({ where: { number: { startsWith: prefix } } });
  const seq = String(count + 1).padStart(4, '0');
  return `${prefix}${seq}`;
}

/** Gera o código do cliente no formato CU{AAMM}-NNNNN (sequência mensal). */
export async function generateCustomerCode(): Promise<string> {
  const ym = yearMonth();
  const prefix = `CU${ym}-`;
  const count = await prisma.customer.count({ where: { code: { startsWith: prefix } } });
  const seq = String(count + 1).padStart(5, '0');
  return `${prefix}${seq}`;
}
