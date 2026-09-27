// Recalcula total, valor pago e situação financeira de todos os pedidos
// (necessário uma vez após adicionar o módulo financeiro). Idempotente.
//   npx tsx scripts/backfill-order-finance.ts
import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });
config({ path: '.env', quiet: true });

async function main() {
  const { prisma } = await import('../lib/db');
  const { recalcOrder } = await import('../lib/orders/ledger');
  const orders = await prisma.order.findMany({ select: { id: true, number: true } });
  for (const o of orders) {
    const r = await recalcOrder(o.id, 'sistema');
    console.log(`${o.number}: total ${(r.totalCents / 100).toFixed(2)} · ${r.paymentStatus}`);
  }
  console.log(`${orders.length} pedido(s) recalculado(s).`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
