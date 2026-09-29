import 'server-only';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

/**
 * Folga no pool: na Vercel (1 CPU) o padrão do Prisma é 3 conexões e 10 s de espera,
 * pouco para o build e para o 1º acesso quando o Prisma Postgres está "acordando".
 * Parâmetros já presentes na DATABASE_URL têm prioridade.
 */
function datasourceUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    const defaults = { connection_limit: '5', pool_timeout: '60', connect_timeout: '60' };
    for (const [k, v] of Object.entries(defaults)) if (!url.searchParams.has(k)) url.searchParams.set(k, v);
    return url.toString();
  } catch {
    return raw;
  }
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ datasourceUrl: datasourceUrl() });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
