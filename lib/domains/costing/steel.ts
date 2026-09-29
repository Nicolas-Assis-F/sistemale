// Geometria e peso de aço (puro, sem banco). Densidade do aço carbono (SAE 1045,
// tubos ASTM A106/A53): 7,85 g/cm³. Dimensões de tubo: ASME B36.10M.

export const STEEL_DENSITY_KG_M3 = 7850;
export const INCH_MM = 25.4;

/** kg por metro de barra redonda maciça de diâmetro `d` (mm). */
export function roundBarKgPerMeter(diameterMm: number) {
  if (!(diameterMm > 0)) return 0;
  const areaM2 = (Math.PI / 4) * (diameterMm / 1000) ** 2;
  return areaM2 * STEEL_DENSITY_KG_M3;
}

/** kg por metro de tubo com diâmetro externo `od` e parede `wall` (mm). */
export function tubeKgPerMeter(odMm: number, wallMm: number) {
  if (!(odMm > 0) || !(wallMm > 0) || wallMm * 2 >= odMm) return 0;
  const areaM2 = Math.PI * (wallMm / 1000) * ((odMm - wallMm) / 1000);
  return areaM2 * STEEL_DENSITY_KG_M3;
}

export type SteelShape = 'BARRA_REDONDA' | 'TUBO';

export function kgPerMeter(shape: SteelShape, diameterMm: number, wallMm?: number | null) {
  return shape === 'TUBO' ? tubeKgPerMeter(diameterMm, wallMm ?? 0) : roundBarKgPerMeter(diameterMm);
}

/** Peso de um pedaço (mm de comprimento), com perda de corte/usinagem em %. */
export function pieceKg(shape: SteelShape, diameterMm: number, wallMm: number | null | undefined, lengthMm: number, scrapPercent = 0) {
  return kgPerMeter(shape, diameterMm, wallMm) * (lengthMm / 1000) * (1 + Math.max(0, scrapPercent) / 100);
}

/** "2 3/8" → 60,325 mm; aceita "2.375", "2,375", "60.3mm". */
export function parseInches(input: string) {
  const s = input.trim().replace(',', '.').replace(/["”″]|pol(egadas?)?/gi, '').trim();
  if (/mm$/i.test(s)) return Number.parseFloat(s) || 0;
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return (Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3])) * INCH_MM;
  const frac = s.match(/^(\d+)\/(\d+)$/);
  if (frac) return (Number(frac[1]) / Number(frac[2])) * INCH_MM;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n * INCH_MM : 0;
}

export type TubeSize = { label: string; nps: string; odMm: number; walls: { schedule: 'SCH 40' | 'SCH 80'; wallMm: number }[] };

/** Medidas usadas pela L&E (diâmetro externo em polegadas = tamanho API/tubing). */
export const TUBE_SIZES: TubeSize[] = [
  { label: '2 3/8"', nps: 'NPS 2', odMm: 60.3, walls: [{ schedule: 'SCH 40', wallMm: 3.91 }, { schedule: 'SCH 80', wallMm: 5.54 }] },
  { label: '2 7/8"', nps: 'NPS 2½', odMm: 73.0, walls: [{ schedule: 'SCH 40', wallMm: 5.16 }, { schedule: 'SCH 80', wallMm: 7.01 }] },
  { label: '3 1/2"', nps: 'NPS 3', odMm: 88.9, walls: [{ schedule: 'SCH 40', wallMm: 5.49 }, { schedule: 'SCH 80', wallMm: 7.62 }] },
];

export const BAR_SIZES = [
  { label: '2 3/8"', diameterMm: parseInches('2 3/8') },
  { label: '2 7/8"', diameterMm: parseInches('2 7/8') },
  { label: '3 1/2"', diameterMm: parseInches('3 1/2') },
];

export const round = (n: number, digits = 2) => Math.round(n * 10 ** digits) / 10 ** digits;

/**
 * Número digitado em pt-BR ou com ponto decimal: "1.234,56", "9,5", "9.50", "60.3", "1.500".
 * Com vírgula: ponto é milhar. Sem vírgula: um único ponto seguido de 1–3 dígitos é
 * decimal ("60.3", "7.62"), exceto no padrão de milhar exato ("1.500" → 1500 só se
 * `thousandsHint`). Devolve null para texto inválido.
 */
export function parseDecimal(input: string | null | undefined, thousandsHint = false): number | null {
  const s = (input ?? '').trim().replace(/\s|R\$/g, '');
  if (!s) return null;
  let normalized: string;
  if (s.includes(',')) normalized = s.replace(/\./g, '').replace(',', '.');
  else if ((s.match(/\./g) ?? []).length > 1) normalized = s.replace(/\./g, '');
  else if (thousandsHint && /^\d{1,3}\.\d{3}$/.test(s)) normalized = s.replace('.', '');
  else normalized = s;
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/** Unidades de nota fiscal que significam quilograma. */
export const isKgUnit = (u: string) => /^(KG|KGS|QUILO|QUILOS|KILO|KILOS|KGM)\.?$/i.test(u.trim());
