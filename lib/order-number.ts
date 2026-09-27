import { prisma } from './db';

function yearMonth(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${yy}${mm}`;
}

/**
 * Próximo número da sequência mensal a partir do MAIOR número existente
 * (não do count): excluir um registro do mês não gera número repetido.
 */
async function nextInSequence(prefix: string, digits: number, last: () => Promise<string | null>) {
  const current = await last();
  const seq = current ? Number(current.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(Number.isFinite(seq) ? seq : 1).padStart(digits, '0')}`;
}

/** Gera o número do pedido no formato SO{AAMM}-NNNN (sequência mensal). */
export async function generateOrderNumber(): Promise<string> {
  const prefix = `SO${yearMonth()}-`;
  return nextInSequence(prefix, 4, async () =>
    (await prisma.order.findFirst({ where: { number: { startsWith: prefix } }, orderBy: { number: 'desc' }, select: { number: true } }))?.number ?? null,
  );
}

/** Gera o código do cliente no formato CU{AAMM}-NNNNN (sequência mensal). */
export async function generateCustomerCode(): Promise<string> {
  const prefix = `CU${yearMonth()}-`;
  return nextInSequence(prefix, 5, async () =>
    (await prisma.customer.findFirst({ where: { code: { startsWith: prefix } }, orderBy: { code: 'desc' }, select: { code: true } }))?.code ?? null,
  );
}

/** Repete a criação quando dois cadastros simultâneos disputam o mesmo número (P2002). */
export async function withUniqueRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? error.code : null;
      if (code !== 'P2002' || i >= attempts - 1) throw error;
    }
  }
}
