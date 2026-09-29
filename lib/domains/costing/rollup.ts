// Custo de uma ficha (puro). Uma ficha produz `batchQty` unidades e tem linhas de:
//   MATERIAL   barra/tubo por kg (comprimento × kg/m × qtd × perda) ou insumo por kg/un
//   COMPONENTE item comprado pronto (qtd × custo unitário)
//   PROCESSO   mão de obra/máquina (minutos × custo-hora × qtd)
//   SERVICO    usinagem/tratamento terceirizado (qtd × custo unitário)
//   SUBFICHA   outra ficha (qtd × custo unitário dela) — ex.: máquina → haste → tool joint
//   OUTRO      valor avulso (qtd × custo unitário)
import { kgPerMeter } from './steel';

export type MaterialKind = 'BARRA_REDONDA' | 'TUBO' | 'COMPONENTE' | 'SERVICO' | 'INSUMO';
export type CostUnit = 'KG' | 'M' | 'UN';
export type LineKind = 'MATERIAL' | 'COMPONENTE' | 'PROCESSO' | 'SERVICO' | 'SUBFICHA' | 'OUTRO';
export type Category = 'material' | 'componentes' | 'maoDeObra' | 'servicos' | 'outros';

export type MaterialInput = { id: string; name: string; kind: MaterialKind; unit: CostUnit; unitCostCents: number; diameterMm?: number | null; wallMm?: number | null };
export type WorkCenterInput = { id: string; name: string; rateCentsPerHour: number };
export type LineInput = {
  id?: string; kind: LineKind; description?: string | null;
  materialId?: string | null; workCenterId?: string | null; subSheetId?: string | null;
  lengthMm?: number | null; quantity: number; minutes?: number | null; scrapBps?: number | null; unitCostCents?: number | null;
};
export type SheetInput = { id: string; name: string; batchQty: number; lines: LineInput[] };
export type Catalog = { materials: Map<string, MaterialInput>; workCenters: Map<string, WorkCenterInput>; sheets: Map<string, SheetInput> };

export type LineResult = { cents: number; kg: number; category: Category | 'misto'; detail: string; warning?: string };
export type ByCategory = Record<Category, number>;
export type SheetResult = {
  totalCents: number; unitCents: number; kgPerUnit: number; byCategory: ByCategory; unitByCategory: ByCategory;
  lines: LineResult[]; warnings: string[];
};

const emptyCats = (): ByCategory => ({ material: 0, componentes: 0, maoDeObra: 0, servicos: 0, outros: 0 });
const fmtKg = (kg: number) => `${kg.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`;
const isSteel = (k: MaterialKind) => k === 'BARRA_REDONDA' || k === 'TUBO';
const categoryOf = (m: MaterialKind): Category => (m === 'COMPONENTE' ? 'componentes' : m === 'SERVICO' ? 'servicos' : 'material');

function lineCost(line: LineInput, catalog: Catalog, stack: string[], memo: Map<string, SheetResult>): LineResult & { cats: ByCategory } {
  const qty = Number.isFinite(line.quantity) ? line.quantity : 0;
  const scrap = 1 + Math.max(0, line.scrapBps ?? 0) / 10_000;
  const cats = emptyCats();
  const done = (cents: number, kg: number, category: Category, detail: string, warning?: string) => {
    cats[category] += cents;
    return { cents, kg, category, detail, warning, cats };
  };

  if (line.kind === 'PROCESSO') {
    const wc = line.workCenterId ? catalog.workCenters.get(line.workCenterId) : undefined;
    const rate = line.unitCostCents ?? wc?.rateCentsPerHour ?? 0;
    const minutes = line.minutes ?? 0;
    const cents = Math.round((minutes / 60) * rate * qty);
    return done(cents, 0, 'maoDeObra', `${minutes} min × ${qty} × ${(rate / 100).toFixed(2)}/h`, !wc && line.unitCostCents == null ? 'Escolha o processo (custo-hora).' : minutes <= 0 ? 'Informe os minutos.' : undefined);
  }

  if (line.kind === 'SUBFICHA') {
    const id = line.subSheetId;
    if (!id || !catalog.sheets.has(id)) return done(0, 0, 'outros', 'Subficha não encontrada', 'Escolha a subficha.');
    if (stack.includes(id)) return done(0, 0, 'outros', 'Ciclo', 'Esta subficha usa a própria ficha (ciclo): ignorada.');
    const sub = computeSheet(id, catalog, stack, memo);
    for (const k of Object.keys(cats) as Category[]) cats[k] += Math.round(sub.unitByCategory[k] * qty);
    const cents = Math.round(sub.unitCents * qty);
    return { cents, kg: sub.kgPerUnit * qty, category: 'misto', detail: `${qty} × ${catalog.sheets.get(id)!.name}`, warning: sub.warnings.length ? `Subficha com pendências: ${sub.warnings[0]}` : undefined, cats };
  }

  const m = line.materialId ? catalog.materials.get(line.materialId) : undefined;
  const fallbackCat: Category = line.kind === 'SERVICO' ? 'servicos' : line.kind === 'COMPONENTE' ? 'componentes' : line.kind === 'MATERIAL' ? 'material' : 'outros';
  if (!m) {
    const unit = line.unitCostCents ?? 0;
    return done(Math.round(unit * qty * scrap), 0, fallbackCat, `${qty} × ${(unit / 100).toFixed(2)}`, unit <= 0 ? 'Informe o custo unitário ou escolha um material.' : undefined);
  }

  const unitCost = line.unitCostCents ?? m.unitCostCents;
  const cat = categoryOf(m.kind);
  if (isSteel(m.kind) && (m.unit === 'KG' || m.unit === 'M')) {
    const lengthMm = line.lengthMm ?? 0;
    const meters = (lengthMm / 1000) * qty * scrap;
    const kg = kgPerMeter(m.kind as 'BARRA_REDONDA' | 'TUBO', m.diameterMm ?? 0, m.wallMm) * meters;
    const cents = Math.round(m.unit === 'KG' ? kg * unitCost : meters * unitCost);
    const warning = lengthMm <= 0 ? 'Informe o comprimento (mm).' : kg <= 0 ? 'Material sem diâmetro/parede cadastrados.' : unitCost <= 0 ? `${m.name} está sem preço.` : undefined;
    return done(cents, kg, cat, `${qty} × ${lengthMm} mm = ${fmtKg(kg)}${m.unit === 'KG' ? ` × ${(unitCost / 100).toFixed(2)}/kg` : ''}`, warning);
  }
  // Por unidade, ou insumo por kg (quantidade = kg)
  const units = qty * scrap;
  return done(Math.round(units * unitCost), m.unit === 'KG' ? units : 0, cat, `${units.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} ${m.unit.toLowerCase()} × ${(unitCost / 100).toFixed(2)}`, unitCost <= 0 ? `${m.name} está sem preço.` : undefined);
}

export function computeSheet(sheetId: string, catalog: Catalog, stack: string[] = [], memo = new Map<string, SheetResult>()): SheetResult {
  const cached = memo.get(sheetId);
  if (cached) return cached;
  const sheet = catalog.sheets.get(sheetId);
  if (!sheet) throw new Error(`Ficha ${sheetId} não encontrada`);
  const nextStack = [...stack, sheetId];
  const byCategory = emptyCats();
  const lines: LineResult[] = [];
  const warnings: string[] = [];
  let totalCents = 0;
  let kg = 0;
  for (const line of sheet.lines) {
    const r = lineCost(line, catalog, nextStack, memo);
    for (const k of Object.keys(byCategory) as Category[]) byCategory[k] += r.cats[k];
    totalCents += r.cents;
    kg += r.kg;
    lines.push({ cents: r.cents, kg: r.kg, category: r.category, detail: r.detail, warning: r.warning });
    if (r.warning) warnings.push(`${line.description || r.detail}: ${r.warning}`);
  }
  const batch = sheet.batchQty > 0 ? sheet.batchQty : 1;
  const unitByCategory = emptyCats();
  for (const k of Object.keys(byCategory) as Category[]) unitByCategory[k] = byCategory[k] / batch;
  const result: SheetResult = { totalCents, unitCents: Math.round(totalCents / batch), kgPerUnit: kg / batch, byCategory, unitByCategory, lines, warnings };
  memo.set(sheetId, result);
  return result;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  material: 'Matéria-prima', componentes: 'Componentes', maoDeObra: 'Mão de obra', servicos: 'Serviços', outros: 'Outros',
};
