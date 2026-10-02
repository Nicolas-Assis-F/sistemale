import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { withUniqueRetry } from '@/lib/order-number';
import { todayStartBR } from '@/lib/finance/summary';
import {
  cutPieces, lengthWithinTolerance, markCode, nextRodSerials, parseCutPlan, pieceRatePay, rodLabel, rodSerialPrefix, rodSku,
} from './rules';

type Tx = Prisma.TransactionClient;
// Banco remoto (produção): lotes de 40 hastes passam dos 5 s padrão da transação.
const TX = { maxWait: 10_000, timeout: 30_000 };

export interface Balances {
  tubes: Record<string, number>;
  pairs: Record<string, number>;
  /** pieces[diameter][lengthM] */
  pieces: Record<string, Record<number, number>>;
}

export async function getBalances(): Promise<Balances> {
  const rows = await prisma.productionMove.groupBy({ by: ['kind', 'diameter', 'lengthM'], _sum: { qty: true } });
  const out: Balances = { tubes: {}, pairs: {}, pieces: {} };
  for (const r of rows) {
    const qty = r._sum.qty ?? 0;
    if (r.kind === 'TUBO') out.tubes[r.diameter] = qty;
    else if (r.kind === 'PAR') out.pairs[r.diameter] = qty;
    else (out.pieces[r.diameter] ??= {})[r.lengthM] = qty;
  }
  return out;
}

export async function registerEntry(kind: 'TUBO' | 'PAR', diameter: string, qty: number, note?: string) {
  await prisma.productionMove.create({ data: { kind, diameter, qty, reason: 'ENTRADA', note: note || null } });
}

/** Contagem física: grava a diferença para o saldo bater com o que existe. */
export async function adjustTo(kind: 'TUBO' | 'PAR' | 'PECA', diameter: string, lengthM: number, counted: number) {
  const current = await prisma.productionMove.aggregate({ where: { kind, diameter, lengthM }, _sum: { qty: true } });
  const diff = counted - (current._sum.qty ?? 0);
  if (diff !== 0) await prisma.productionMove.create({ data: { kind, diameter, lengthM, qty: diff, reason: 'AJUSTE', note: `Contagem: ${counted}` } });
  return diff;
}

export async function registerCut(input: { diameter: string; plan: string; tubes: number; employeeId?: string | null }) {
  if (!parseCutPlan(input.plan)) throw new Error('Plano de corte inválido');
  const pieces = cutPieces(input.plan, input.tubes);
  const note = `${input.tubes} tubo(s) em ${input.plan}`;
  await prisma.productionMove.createMany({
    data: [
      { kind: 'TUBO', diameter: input.diameter, qty: -input.tubes, reason: 'CORTE', note, employeeId: input.employeeId ?? null },
      ...Object.entries(pieces).map(([len, qty]) => ({
        kind: 'PECA' as const, diameter: input.diameter, lengthM: Number(len), qty, reason: 'CORTE' as const, note, employeeId: input.employeeId ?? null,
      })),
    ],
  });
}

/** Solda: cada haste consome 1 peça cortada + 1 par e nasce aguardando inspeção. */
export async function registerWeld(input: { diameter: string; lengthM: number; qty: number; welderId: string; helperId?: string | null; weldedOn?: Date }) {
  const welder = await prisma.employee.findUniqueOrThrow({ where: { id: input.welderId }, select: { markLetter: true, name: true } });
  // A marca segue o dia em que a haste foi soldada, mesmo lançada depois.
  const mark = markCode(input.weldedOn ?? new Date(), welder.markLetter || welder.name);
  const prefix = rodSerialPrefix(new Date());
  const note = `${input.qty}× ${rodLabel(input.diameter, input.lengthM)} — marca ${mark}`;
  return withUniqueRetry(() => prisma.$transaction(async (tx) => {
    const last = await tx.rod.findFirst({ where: { serial: { startsWith: prefix } }, orderBy: { serial: 'desc' }, select: { serial: true } });
    const serials = nextRodSerials(prefix, last?.serial ?? null, input.qty);
    await tx.rod.createMany({
      data: serials.map((serial) => ({
        serial, markCode: mark, diameter: input.diameter, lengthM: input.lengthM, welderId: input.welderId, helperId: input.helperId || null,
      })),
    });
    await tx.productionMove.createMany({
      data: [
        { kind: 'PECA', diameter: input.diameter, lengthM: input.lengthM, qty: -input.qty, reason: 'SOLDA', note, employeeId: input.welderId },
        { kind: 'PAR', diameter: input.diameter, qty: -input.qty, reason: 'SOLDA', note, employeeId: input.welderId },
      ],
    });
    return { mark, first: serials[0], last: serials[serials.length - 1] };
  }, TX));
}

async function addCatalogStock(tx: Tx, rods: { diameter: string; lengthM: number }[]) {
  const bySku = new Map<string, number>();
  for (const r of rods) bySku.set(rodSku(r.diameter, r.lengthM), (bySku.get(rodSku(r.diameter, r.lengthM)) ?? 0) + 1);
  const products = await tx.product.findMany({ where: { sku: { in: [...bySku.keys()] } }, select: { id: true, sku: true } });
  for (const p of products) await tx.product.update({ where: { id: p.id }, data: { stock: { increment: bySku.get(p.sku)! } } });
  return new Map(products.map((p) => [p.sku, p.id]));
}

/** Aprova as hastes (checklist todo OK) e soma no estoque do catálogo. */
export async function approveRods(ids: string[]) {
  return prisma.$transaction(async (tx) => {
    const rods = await tx.rod.findMany({ where: { id: { in: ids }, status: { in: ['INSPECAO', 'RETRABALHO'] } }, select: { id: true, diameter: true, lengthM: true } });
    if (rods.length === 0) return 0;
    const productBySku = await addCatalogStock(tx, rods);
    const now = new Date();
    for (const r of rods) {
      await tx.rod.update({
        where: { id: r.id },
        data: { status: 'APROVADA', approvedAt: now, inspectedAt: now, defect: null, productId: productBySku.get(rodSku(r.diameter, r.lengthM)) ?? null },
      });
    }
    return rods.length;
  }, TX);
}

/**
 * Inspeção individual. Comprimento medido fora de ±5 mm nunca aprova:
 * vira retrabalho por comprimento.
 */
export async function inspectRod(id: string, input: { result: 'APROVADA' | 'RETRABALHO' | 'REFUGO'; defect?: string | null; measuredMm?: number | null }) {
  const rod = await prisma.rod.findUniqueOrThrow({ where: { id }, select: { status: true, lengthM: true } });
  if (rod.status !== 'INSPECAO' && rod.status !== 'RETRABALHO') throw new Error('Esta haste já foi finalizada');
  const outOfTolerance = input.measuredMm != null && !lengthWithinTolerance(rod.lengthM, input.measuredMm);
  if (input.result === 'APROVADA' && !outOfTolerance) {
    await approveRods([id]);
    if (input.measuredMm != null) await prisma.rod.update({ where: { id }, data: { measuredMm: input.measuredMm } });
    return 'APROVADA' as const;
  }
  const result = input.result === 'APROVADA' ? 'RETRABALHO' : input.result;
  await prisma.rod.update({
    where: { id },
    data: { status: result, inspectedAt: new Date(), measuredMm: input.measuredMm ?? null, defect: outOfTolerance ? 'Comprimento' : input.defect || 'Outro' },
  });
  return result;
}

/** Hastes aprovadas ainda não pagas, por pessoa (como soldador e como ajudante). */
export async function getUnpaid() {
  const [welded, helped] = await Promise.all([
    prisma.rod.groupBy({ by: ['welderId'], where: { status: 'APROVADA', welderPayoutId: null }, _count: { _all: true } }),
    prisma.rod.groupBy({ by: ['helperId'], where: { status: 'APROVADA', helperPayoutId: null, helperId: { not: null } }, _count: { _all: true } }),
  ]);
  const out = new Map<string, { welded: number; helped: number }>();
  for (const w of welded) out.set(w.welderId, { welded: w._count._all, helped: 0 });
  for (const h of helped) {
    const cur = out.get(h.helperId!) ?? { welded: 0, helped: 0 };
    out.set(h.helperId!, { ...cur, helped: h._count._all });
  }
  return out;
}

/** Fecha o pagamento: marca as hastes como pagas e lança a despesa no Financeiro. */
export async function closePayout(employeeId: string) {
  return prisma.$transaction(async (tx) => {
    const employee = await tx.employee.findUniqueOrThrow({ where: { id: employeeId }, select: { name: true, pieceRateCents: true } });
    if (employee.pieceRateCents <= 0) throw new Error('Cadastre o valor por haste antes de fechar o pagamento');
    const [weldedIds, helpedIds] = await Promise.all([
      tx.rod.findMany({ where: { status: 'APROVADA', welderId: employeeId, welderPayoutId: null }, select: { id: true } }),
      tx.rod.findMany({ where: { status: 'APROVADA', helperId: employeeId, helperPayoutId: null }, select: { id: true } }),
    ]);
    const welded = weldedIds.length;
    const helped = helpedIds.length;
    if (welded + helped === 0) return null;
    const amountCents = pieceRatePay(welded, helped, employee.pieceRateCents);
    const today = todayStartBR();
    const competence = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).format(today).slice(0, 7);
    const entry = await tx.financeEntry.create({
      data: {
        type: 'DESPESA', category: 'MAO_OBRA_PRODUCAO', status: 'PREVISTO', amountCents, competence, dueDate: today,
        description: `Produção de hastes — ${employee.name} (${welded + helped} aprovada${welded + helped > 1 ? 's' : ''})`,
        supplier: employee.name, employeeId,
      },
    });
    const payout = await tx.productionPayout.create({
      data: { employeeId, welded, helped, rateCents: employee.pieceRateCents, amountCents, financeEntryId: entry.id },
    });
    await tx.rod.updateMany({ where: { id: { in: weldedIds.map((r) => r.id) } }, data: { welderPayoutId: payout.id } });
    await tx.rod.updateMany({ where: { id: { in: helpedIds.map((r) => r.id) } }, data: { helperPayoutId: payout.id } });
    return payout;
  }, TX);
}
