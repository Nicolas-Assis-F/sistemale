// Regras puras da produção de hastes — seguras para client components (sem Prisma).

export const DIAMETERS = [
  { code: '238', label: '2 3/8″' },
  { code: '278', label: '2 7/8″' },
  { code: '312', label: '3 1/2″' },
] as const;
export type DiameterCode = (typeof DIAMETERS)[number]['code'];

export const ROD_LENGTHS = [2, 3, 4] as const;
export const TUBE_LENGTH_M = 9;
/** Tolerância do comprimento total da haste (mm, para mais ou para menos). */
export const LENGTH_TOLERANCE_MM = 5;

/** Planos de corte do tubo de 9 m. Os sem sobra primeiro. */
export const CUT_PLANS = ['3+3+3', '4+3+2', '3+2+2+2', '4+4', '2+2+2+2', '4+2+2', '3+3+2'] as const;

/** O que a inspeção confere em toda haste (aprovar = tudo isso OK). */
export const INSPECTION_CHECKS = [
  'Solda: cordão completo, sem trinca, poro ou mordedura',
  'Alinhamento: rola reta nos cavaletes',
  `Comprimento dentro de ±${LENGTH_TOLERANCE_MM} mm`,
  'Roscas limpas e rosqueando na haste-padrão',
  'Marca gravada legível',
] as const;

export const DEFECTS = ['Solda', 'Alinhamento', 'Comprimento', 'Rosca', 'Marcação', 'Outro'] as const;

export const isDiameter = (v: string): v is DiameterCode => DIAMETERS.some((d) => d.code === v);
export const diameterLabel = (code: string) => DIAMETERS.find((d) => d.code === code)?.label ?? code;
export const rodLabel = (diameter: string, lengthM: number) => `${diameterLabel(diameter)} × ${lengthM} m`;
/** SKU do catálogo que recebe o estoque da haste aprovada. */
export const rodSku = (diameter: string, lengthM: number) => `LE-HASTE-${diameter}-${lengthM}M`;

/** "4+3+2" → [4, 3, 2]. Recusa peças fora de 2/3/4 m ou que passam de 9 m. */
export function parseCutPlan(plan: string): number[] | null {
  const pieces = plan.split('+').map((p) => Number(p.trim()));
  if (pieces.length === 0 || pieces.some((p) => !(ROD_LENGTHS as readonly number[]).includes(p))) return null;
  return pieces.reduce((s, p) => s + p, 0) <= TUBE_LENGTH_M ? pieces : null;
}

export function cutPlanWasteM(plan: string): number {
  const pieces = parseCutPlan(plan);
  return pieces ? TUBE_LENGTH_M - pieces.reduce((s, p) => s + p, 0) : 0;
}

/** Peças geradas por N tubos cortados no mesmo plano: { 3: 2, 4: 1 }. */
export function cutPieces(plan: string, tubes: number): Record<number, number> {
  const out: Record<number, number> = {};
  for (const p of parseCutPlan(plan) ?? []) out[p] = (out[p] ?? 0) + tubes;
  return out;
}

/** Dia/mês/ano no fuso de Brasília. */
function partsBR(date: Date) {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(date).split('-');
  return { yy: y.slice(-2), mm: m, dd: d };
}

/** Marca gravada na haste: dia + mês + ano + letra do soldador → "021026S". */
export function markCode(date: Date, letter: string): string {
  const { yy, mm, dd } = partsBR(date);
  return `${dd}${mm}${yy}${letter.trim().toUpperCase().slice(0, 1) || 'X'}`;
}

/** Prefixo do número interno da haste: H{AAMM}- (sequência mensal). */
export function rodSerialPrefix(date: Date): string {
  const { yy, mm } = partsBR(date);
  return `H${yy}${mm}-`;
}

/** Números internos em sequência a partir do último do mês. */
export function nextRodSerials(prefix: string, last: string | null, count: number): string[] {
  const start = last ? Number(last.slice(prefix.length)) + 1 : 1;
  const first = Number.isFinite(start) ? start : 1;
  return Array.from({ length: count }, (_, i) => `${prefix}${String(first + i).padStart(4, '0')}`);
}

/** Comprimento medido (mm) dentro da tolerância do comprimento nominal (m)? */
export function lengthWithinTolerance(lengthM: number, measuredMm: number, toleranceMm = LENGTH_TOLERANCE_MM): boolean {
  return Math.abs(measuredMm - lengthM * 1000) <= toleranceMm;
}

/** Valor a pagar por produção: cada haste aprovada conta uma vez por pessoa. */
export function pieceRatePay(welded: number, helped: number, rateCents: number): number {
  return Math.max(0, welded + helped) * Math.max(0, rateCents);
}
