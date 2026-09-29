// Custos com banco (server-only, NÃO é Server Action).
import 'server-only';
import type { PricingProfile } from '@prisma/client';
import { prisma } from '@/lib/db';
import { computeSheet, type Catalog, type SheetResult } from './rollup';
import { marginAtPrice, simplesEffectiveBps, suggestPrice, type PriceInputs } from './pricing';

export async function loadCatalog(): Promise<Catalog> {
  const [materials, workCenters, sheets] = await Promise.all([
    prisma.material.findMany(),
    prisma.workCenter.findMany(),
    prisma.costSheet.findMany({ include: { lines: { orderBy: { position: 'asc' } } } }),
  ]);
  return {
    materials: new Map(materials.map((m) => [m.id, { id: m.id, name: m.name, kind: m.kind, unit: m.unit, unitCostCents: m.unitCostCents, diameterMm: m.diameterMm, wallMm: m.wallMm }])),
    workCenters: new Map(workCenters.map((w) => [w.id, { id: w.id, name: w.name, rateCentsPerHour: w.rateCentsPerHour }])),
    sheets: new Map(sheets.map((s) => [s.id, {
      id: s.id, name: s.name, batchQty: s.batchQty,
      lines: s.lines.map((l) => ({
        id: l.id, kind: l.kind, description: l.description, materialId: l.materialId, workCenterId: l.workCenterId, subSheetId: l.subSheetId,
        lengthMm: l.lengthMm, quantity: l.quantity, minutes: l.minutes, scrapBps: l.scrapBps, unitCostCents: l.unitCostCents,
      })),
    }])),
  };
}

/** Perfil padrão de preço; cria um com valores neutros na primeira vez. */
export async function defaultPricingProfile() {
  const existing = await prisma.pricingProfile.findFirst({ where: { isDefault: true } }) ?? await prisma.pricingProfile.findFirst();
  if (existing) return existing;
  return prisma.pricingProfile.create({ data: { name: 'Padrão', isDefault: true, commissionBps: 0, paymentFeeBps: 100, fixedExpenseBps: 1000, marginBps: 1500 } });
}

export function priceInputs(p: PricingProfile): PriceInputs & { dasBps: number | null } {
  const dasBps = p.dasOverrideBps ?? simplesEffectiveBps(p.rbt12Cents);
  return {
    dasBps,
    taxBps: (dasBps ?? 0) + p.otherTaxBps,
    commissionBps: p.commissionBps,
    paymentFeeBps: p.paymentFeeBps,
    fixedExpenseBps: p.fixedExpenseBps,
    marginBps: p.marginBps,
  };
}

export type SheetSummary = {
  id: string; name: string; batchQty: number; product: { id: string; name: string; slug: string; priceCents: number } | null;
  result: SheetResult; suggestedCents: number | null; currentMarginBps: number | null;
};

export async function summarizeSheets(): Promise<{ profile: PricingProfile; inputs: ReturnType<typeof priceInputs>; sheets: SheetSummary[] }> {
  const [catalog, profile, sheets] = await Promise.all([
    loadCatalog(),
    defaultPricingProfile(),
    prisma.costSheet.findMany({ orderBy: { name: 'asc' }, include: { product: { select: { id: true, name: true, slug: true, priceCents: true } }, pricingProfile: true } }),
  ]);
  const memo = new Map<string, SheetResult>();
  const baseInputs = priceInputs(profile);
  return {
    profile,
    inputs: baseInputs,
    sheets: sheets.map((s) => {
      const inputs = s.pricingProfile ? priceInputs(s.pricingProfile) : baseInputs;
      const result = computeSheet(s.id, catalog, [], memo);
      const suggestion = suggestPrice(result.unitCents, inputs);
      return {
        id: s.id, name: s.name, batchQty: s.batchQty, product: s.product, result,
        suggestedCents: suggestion.ok ? suggestion.priceCents : null,
        currentMarginBps: s.product?.priceCents ? marginAtPrice(s.product.priceCents, result.unitCents, inputs) : null,
      };
    }),
  };
}

/**
 * Sugestões a partir do que o sistema já registra: faturamento dos últimos 12
 * meses (recebimentos de pedidos) e peso das despesas fixas sobre a receita
 * (financeiro, últimos 3 meses). Apenas referência: o contador confirma o RBT12.
 */
export async function pricingHints() {
  const now = new Date();
  const yearAgo = new Date(now.getTime() - 365 * 86_400_000);
  const quarterAgo = new Date(now.getTime() - 90 * 86_400_000);
  const [received12, received3, expenses3] = await Promise.all([
    prisma.payment.aggregate({ where: { status: { in: ['RECEBIDO', 'CONFIRMADO'] }, paidAt: { gte: yearAgo } }, _sum: { amountCents: true } }),
    prisma.payment.aggregate({ where: { status: { in: ['RECEBIDO', 'CONFIRMADO'] }, paidAt: { gte: quarterAgo } }, _sum: { amountCents: true } }),
    prisma.financeEntry.aggregate({ where: { type: 'DESPESA', status: { not: 'CANCELADO' }, dueDate: { gte: quarterAgo, lte: now } }, _sum: { amountCents: true } }),
  ]);
  const revenue3 = received3._sum.amountCents ?? 0;
  const expense3 = expenses3._sum.amountCents ?? 0;
  return {
    rbt12Cents: received12._sum.amountCents ?? 0,
    fixedExpenseBps: revenue3 > 0 ? Math.round((expense3 / revenue3) * 10_000) : null,
    expense3Cents: expense3,
    revenue3Cents: revenue3,
  };
}
