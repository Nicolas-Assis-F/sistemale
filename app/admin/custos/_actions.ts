'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { BAR_SIZES, parseDecimal, TUBE_SIZES } from '@/lib/domains/costing/steel';
import { isKgUnit, NfeParseError, parseNfeXml } from '@/lib/domains/costing/nfe';
import { loadCatalog } from '@/lib/domains/costing/service';
import { computeSheet } from '@/lib/domains/costing/rollup';

type Result = { ok: true; message?: string } | { error: string };

const refresh = () => {
  revalidatePath('/admin/custos', 'layout');
};

const num = (label: string) => z.string().trim().optional().transform((v, ctx) => {
  if (!v) return null;
  const n = parseDecimal(v);
  if (n == null || n < 0) {
    ctx.addIssue({ code: 'custom', message: `${label}: número inválido` });
    return z.NEVER;
  }
  return n;
});
/** Aceita "1.234,56", "9,50", "9.50" (reais) → centavos */
const money = z.string().trim().optional().transform((v, ctx) => {
  if (!v) return 0;
  const n = parseDecimal(v, true);
  if (n == null || n < 0) {
    ctx.addIssue({ code: 'custom', message: 'Valor em reais inválido' });
    return z.NEVER;
  }
  return Math.round(n * 100);
});
const percentBps = (label: string) => num(label).transform((v) => (v == null ? 0 : Math.round(v * 100)));

// ─── Materiais ──────────────────────────────────────────────────────────────────

const materialSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome').max(120),
  kind: z.enum(['BARRA_REDONDA', 'TUBO', 'COMPONENTE', 'SERVICO', 'INSUMO']),
  grade: z.string().trim().max(60).optional(),
  sizeLabel: z.string().trim().max(60).optional(),
  diameterMm: num('Diâmetro'),
  wallMm: num('Parede'),
  unit: z.enum(['KG', 'M', 'UN']),
  unitCost: money,
  ncm: z.string().trim().max(10).optional(),
  supplier: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(500).optional(),
});

export async function saveMaterial(id: string | null, formData: FormData): Promise<Result> {
  await requireAdmin();
  const parsed = materialSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Revise os campos.' };
  const d = parsed.data;
  if ((d.kind === 'BARRA_REDONDA' || d.kind === 'TUBO') && !d.diameterMm) return { error: 'Informe o diâmetro (mm).' };
  if (d.kind === 'TUBO' && (!d.wallMm || d.wallMm * 2 >= (d.diameterMm ?? 0))) return { error: 'Informe uma parede válida para o tubo.' };
  const data = {
    name: d.name, kind: d.kind, grade: d.grade || null, sizeLabel: d.sizeLabel || null,
    diameterMm: d.diameterMm, wallMm: d.kind === 'TUBO' ? d.wallMm : null, unit: d.unit, unitCostCents: d.unitCost,
    ncm: d.ncm?.replace(/\D/g, '') || null, supplier: d.supplier || null, notes: d.notes || null,
  };
  if (id) await prisma.material.update({ where: { id }, data });
  else await prisma.material.create({ data });
  refresh();
  return { ok: true, message: 'Material salvo.' };
}

export async function deleteMaterial(id: string): Promise<Result> {
  await requireAdmin();
  const used = await prisma.costSheetLine.count({ where: { materialId: id } });
  if (used) {
    await prisma.material.update({ where: { id }, data: { active: false } });
    refresh();
    return { ok: true, message: `Material usado em ${used} linha(s) de ficha: foi arquivado, não apagado.` };
  }
  await prisma.material.delete({ where: { id } });
  refresh();
  return { ok: true, message: 'Material excluído.' };
}

/** Cadastra as medidas usadas pela L&E: barras SAE 1045 e tubos SCH 40/80. */
export async function seedStandardMaterials(): Promise<Result> {
  await requireAdmin();
  const existing = new Set((await prisma.material.findMany({ select: { name: true } })).map((m) => m.name));
  const rows: Prisma.MaterialCreateManyInput[] = [
    ...BAR_SIZES.map((b) => ({ name: `Barra redonda SAE 1045 ${b.label}`, kind: 'BARRA_REDONDA' as const, grade: 'SAE 1045', sizeLabel: b.label, diameterMm: Math.round(b.diameterMm * 1000) / 1000, unit: 'KG' as const, unitCostCents: 900 })),
    ...TUBE_SIZES.flatMap((t) => t.walls.map((w) => ({ name: `Tubo ${t.label} ${w.schedule}`, kind: 'TUBO' as const, grade: 'ASTM A106/A53', sizeLabel: `${t.label} ${w.schedule}`, diameterMm: t.odMm, wallMm: w.wallMm, unit: 'KG' as const, unitCostCents: 0 }))),
  ].filter((r) => !existing.has(r.name));
  if (!rows.length) return { ok: true, message: 'As medidas padrão já estão cadastradas.' };
  await prisma.material.createMany({ data: rows });
  refresh();
  return { ok: true, message: `${rows.length} material(is) cadastrado(s). Confira os preços por kg dos tubos.` };
}

// ─── Processos (custo-hora) ─────────────────────────────────────────────────────

const workCenterSchema = z.object({ name: z.string().trim().min(2, 'Informe o nome').max(80), rate: money, notes: z.string().trim().max(300).optional() });

export async function saveWorkCenter(id: string | null, formData: FormData): Promise<Result> {
  await requireAdmin();
  const parsed = workCenterSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Revise os campos.' };
  const data = { name: parsed.data.name, rateCentsPerHour: parsed.data.rate, notes: parsed.data.notes || null };
  try {
    if (id) await prisma.workCenter.update({ where: { id }, data });
    else await prisma.workCenter.create({ data });
  } catch {
    return { error: 'Já existe um processo com esse nome.' };
  }
  refresh();
  return { ok: true, message: 'Processo salvo.' };
}

export async function deleteWorkCenter(id: string): Promise<Result> {
  await requireAdmin();
  const used = await prisma.costSheetLine.count({ where: { workCenterId: id } });
  if (used) return { error: `Usado em ${used} linha(s) de ficha. Troque nas fichas antes de excluir.` };
  await prisma.workCenter.delete({ where: { id } });
  refresh();
  return { ok: true, message: 'Processo excluído.' };
}

// ─── Formação de preço ──────────────────────────────────────────────────────────

const profileSchema = z.object({
  rbt12: money,
  dasOverride: num('DAS manual'),
  otherTax: percentBps('Outros impostos'),
  commission: percentBps('Comissão'),
  paymentFee: percentBps('Taxa de pagamento'),
  fixedExpense: percentBps('Despesas fixas'),
  margin: percentBps('Margem'),
});

export async function savePricingProfile(id: string, formData: FormData): Promise<Result> {
  await requireAdmin();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Revise os campos.' };
  const d = parsed.data;
  const total = d.otherTax + d.commission + d.paymentFee + d.fixedExpense + d.margin + (d.dasOverride != null ? Math.round(d.dasOverride * 100) : 0);
  if (total >= 10_000) return { error: 'A soma dos percentuais passa de 100%: não existe preço possível.' };
  await prisma.pricingProfile.update({
    where: { id },
    data: {
      rbt12Cents: d.rbt12, dasOverrideBps: d.dasOverride != null ? Math.round(d.dasOverride * 100) : null,
      otherTaxBps: d.otherTax, commissionBps: d.commission, paymentFeeBps: d.paymentFee, fixedExpenseBps: d.fixedExpense, marginBps: d.margin,
    },
  });
  refresh();
  return { ok: true, message: 'Parâmetros de preço salvos. Todas as fichas foram recalculadas.' };
}

// ─── Fichas de custo ────────────────────────────────────────────────────────────

export async function createSheet(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get('name') ?? '').trim().slice(0, 120);
  const productId = String(formData.get('productId') ?? '') || null;
  if (name.length < 2 && !productId) return;
  let finalName = name;
  if (productId) {
    const p = await prisma.product.findUnique({ where: { id: productId }, select: { name: true, costSheet: { select: { id: true } } } });
    if (!p) return;
    if (p.costSheet) redirect(`/admin/custos/fichas/${p.costSheet.id}`);
    finalName ||= p.name;
  }
  const sheet = await prisma.costSheet.create({ data: { name: finalName, productId } });
  refresh();
  redirect(`/admin/custos/fichas/${sheet.id}`);
}

const lineSchema = z.object({
  kind: z.enum(['MATERIAL', 'COMPONENTE', 'PROCESSO', 'SERVICO', 'SUBFICHA', 'OUTRO']),
  description: z.string().trim().max(200).nullish(),
  materialId: z.string().nullish(),
  workCenterId: z.string().nullish(),
  subSheetId: z.string().nullish(),
  lengthMm: z.number().min(0).max(100_000).nullish(),
  quantity: z.number().min(0).max(1_000_000),
  minutes: z.number().min(0).max(100_000).nullish(),
  scrapBps: z.number().int().min(0).max(10_000).nullish(),
  unitCostCents: z.number().int().min(0).max(1_000_000_000).nullish(),
});
const sheetSchema = z.object({
  name: z.string().trim().min(2).max(120),
  batchQty: z.number().positive().max(100_000),
  ncm: z.string().trim().max(10).nullish(),
  notes: z.string().trim().max(1000).nullish(),
  productId: z.string().nullish(),
  lines: z.array(lineSchema).max(300),
});

export async function saveSheet(id: string, payload: unknown): Promise<Result> {
  await requireAdmin();
  const parsed = sheetSchema.safeParse(payload);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Revise a ficha.' };
  const d = parsed.data;
  if (d.lines.some((l) => l.subSheetId === id)) return { error: 'Uma ficha não pode usar a si mesma como subficha.' };
  if (d.productId) {
    const other = await prisma.costSheet.findFirst({ where: { productId: d.productId, NOT: { id } }, select: { name: true } });
    if (other) return { error: `Esse produto já tem a ficha "${other.name}".` };
  }
  await prisma.$transaction([
    prisma.costSheet.update({ where: { id }, data: { name: d.name, batchQty: d.batchQty, ncm: d.ncm?.replace(/\D/g, '') || null, notes: d.notes || null, productId: d.productId || null } }),
    prisma.costSheetLine.deleteMany({ where: { sheetId: id } }),
    prisma.costSheetLine.createMany({
      data: d.lines.map((l, i) => ({
        sheetId: id, position: i, kind: l.kind, description: l.description || null,
        materialId: l.materialId || null, workCenterId: l.workCenterId || null, subSheetId: l.subSheetId || null,
        lengthMm: l.lengthMm ?? null, quantity: l.quantity, minutes: l.minutes ?? null, scrapBps: l.scrapBps ?? 0, unitCostCents: l.unitCostCents ?? null,
      })),
    }),
  ]);
  // Ciclo indireto (A → B → A) só aparece com todas as fichas: avisa em vez de gravar errado
  const catalog = await loadCatalog();
  const result = computeSheet(id, catalog);
  refresh();
  const cycle = result.warnings.find((w) => w.includes('ciclo'));
  return cycle ? { error: `Ficha salva, mas há um ciclo entre subfichas: ${cycle}` } : { ok: true, message: 'Ficha salva.' };
}

export async function deleteSheet(id: string): Promise<Result> {
  await requireAdmin();
  const usedIn = await prisma.costSheetLine.count({ where: { subSheetId: id } });
  if (usedIn) return { error: `Esta ficha é subficha de ${usedIn} outra(s). Remova de lá antes.` };
  await prisma.costSheet.delete({ where: { id } });
  refresh();
  return { ok: true, message: 'Ficha excluída.' };
}

/** Grava o preço sugerido (ou outro) no produto da vitrine. */
export async function applyPriceToProduct(sheetId: string, priceCents: number): Promise<Result> {
  await requireAdmin();
  if (!Number.isInteger(priceCents) || priceCents <= 0) return { error: 'Preço inválido.' };
  const sheet = await prisma.costSheet.findUnique({ where: { id: sheetId }, select: { productId: true, product: { select: { originalPriceCents: true } } } });
  if (!sheet?.productId) return { error: 'Ligue a ficha a um produto primeiro.' };
  // "Preço De" que ficasse abaixo do novo preço deixaria de valer: limpa
  const original = sheet.product?.originalPriceCents;
  await prisma.product.update({ where: { id: sheet.productId }, data: { priceCents, ...(original && original <= priceCents ? { originalPriceCents: null } : {}) } });
  revalidatePath('/admin/produtos');
  revalidatePath('/vitrine', 'layout');
  refresh();
  return { ok: true, message: 'Preço aplicado ao produto da vitrine.' };
}

// ─── Notas de compra (XML NF-e) ─────────────────────────────────────────────────

export async function importPurchaseInvoice(_prev: unknown, formData: FormData): Promise<{ error?: string; ok?: string } | undefined> {
  await requireAdmin();
  const files = formData.getAll('xml').filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { error: 'Escolha um ou mais arquivos XML de NF-e.' };
  const done: string[] = [];
  const errors: string[] = [];
  for (const file of files.slice(0, 20)) {
    if (file.size > 2_000_000) { errors.push(`${file.name}: maior que 2 MB`); continue; }
    try {
      const xml = await file.text();
      const n = parseNfeXml(xml);
      const exists = await prisma.purchaseInvoice.findUnique({ where: { accessKey: n.accessKey }, select: { id: true } });
      if (exists) { errors.push(`${file.name}: nota ${n.number} já importada`); continue; }
      await prisma.purchaseInvoice.create({
        data: {
          accessKey: n.accessKey, number: n.number, series: n.series, issuedAt: n.issuedAt,
          supplierDoc: n.supplierDoc, supplierName: n.supplierName, supplierUf: n.supplierState || null,
          recipientDoc: n.recipientDoc || null, totalCents: n.totalCents, xml,
          items: {
            create: n.items.map((it) => ({
              position: it.position, code: it.code, description: it.description, ncm: it.ncm, cfop: it.cfop, unit: it.unit,
              quantity: it.quantity, totalCents: it.totalCents, ipiCents: it.ipiCents, icmsCents: it.icmsCents, icmsStCents: it.icmsStCents,
              effectiveTotalCents: it.effectiveTotalCents, effectiveUnitCostCents: it.effectiveUnitCostCents,
            })),
          },
        },
      });
      done.push(`${n.supplierName} nº ${n.number}`);
    } catch (e) {
      errors.push(`${file.name}: ${e instanceof NfeParseError ? e.message : 'não foi possível ler'}`);
    }
  }
  refresh();
  return {
    ok: done.length ? `${done.length} nota(s) importada(s): ${done.join('; ')}` : undefined,
    error: errors.length ? errors.join(' · ') : undefined,
  };
}

/**
 * Liga um item da nota a um material e atualiza o custo dele. Material por kg e
 * nota em peça/barra: informe o peso por unidade (kgPerUnit) para converter.
 */
export async function applyInvoiceItem(itemId: string, materialId: string, kgPerUnit: number | null): Promise<Result> {
  await requireAdmin();
  const item = await prisma.purchaseInvoiceItem.findUnique({ where: { id: itemId }, include: { invoice: { select: { issuedAt: true, supplierName: true } } } });
  const material = await prisma.material.findUnique({ where: { id: materialId } });
  if (!item || !material) return { error: 'Item ou material não encontrado.' };

  let unitCost: number;
  if (material.unit === 'KG' && !isKgUnit(item.unit)) {
    if (!kgPerUnit || kgPerUnit <= 0) return { error: `A nota está em "${item.unit}". Informe quantos kg tem cada ${item.unit.toLowerCase()} para converter.` };
    unitCost = Math.round(item.effectiveUnitCostCents / kgPerUnit);
  } else {
    unitCost = item.effectiveUnitCostCents;
  }
  await prisma.$transaction([
    prisma.purchaseInvoiceItem.update({ where: { id: itemId }, data: { materialId, kgPerUnit, appliedAt: new Date() } }),
    prisma.material.update({
      where: { id: materialId },
      data: {
        unitCostCents: unitCost, lastPurchaseAt: item.invoice.issuedAt ?? new Date(),
        supplier: item.invoice.supplierName, ncm: material.ncm ?? (item.ncm || null),
      },
    }),
  ]);
  refresh();
  return { ok: true, message: `Custo de "${material.name}" atualizado para R$ ${(unitCost / 100).toFixed(2).replace('.', ',')}/${material.unit.toLowerCase()}.` };
}

export async function deletePurchaseInvoice(id: string): Promise<Result> {
  await requireAdmin();
  await prisma.purchaseInvoice.delete({ where: { id } });
  refresh();
  return { ok: true, message: 'Nota removida (os custos já aplicados nos materiais continuam).' };
}
