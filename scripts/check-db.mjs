// Roda antes do `next build`: acorda o banco (o Prisma Postgres pode levar ~1 min
// para responder depois de um tempo parado) e mostra para onde a DATABASE_URL aponta
// (sem a senha). Sem isso o build falha com P2024 ao gerar as páginas estáticas.
import { PrismaClient } from '@prisma/client';

const raw = process.env.DATABASE_URL;
if (!raw) {
  console.error('✗ DATABASE_URL não definida.');
  process.exit(1);
}

let url;
try {
  url = new URL(raw);
} catch {
  console.error('✗ DATABASE_URL inválida (confira se não ficou com aspas ou espaços).');
  process.exit(1);
}
console.log(`→ Banco: ${url.protocol}//${url.hostname}:${url.port || 5432}${url.pathname}`);
url.searchParams.set('pool_timeout', '60');
url.searchParams.set('connect_timeout', '60');

const started = Date.now();
const DEADLINE_MS = 180_000;
for (let attempt = 1; ; attempt++) {
  const prisma = new PrismaClient({ datasourceUrl: url.toString() });
  try {
    await prisma.$queryRaw`select 1`;
    const products = await prisma.product.count();
    console.log(`✓ Banco respondeu em ${Date.now() - started} ms (${products} produtos).`);
    await prisma.$disconnect();
    break;
  } catch (e) {
    await prisma.$disconnect().catch(() => {});
    const msg = `${e.code ?? ''} ${String(e.message).split('\n').filter(Boolean).pop()}`.trim();
    if (Date.now() - started > DEADLINE_MS) {
      console.error(`✗ Banco não respondeu em ${Math.round((Date.now() - started) / 1000)} s: ${msg}`);
      process.exit(1);
    }
    console.log(`… tentativa ${attempt} sem resposta (${msg}); tentando de novo`);
    await new Promise((r) => setTimeout(r, 3000));
  }
}
