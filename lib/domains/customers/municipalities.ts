// Consulta ao catálogo de municípios do IBGE (tabela Municipality).
import { prisma } from '@/lib/db';

export const BR_STATES = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB',
  'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
] as const;
export type BrState = (typeof BR_STATES)[number];

export const isBrState = (v: string): v is BrState => (BR_STATES as readonly string[]).includes(v);

/** "Goiânia" → "goiania"; "Alta Floresta D'Oeste" → "alta floresta d'oeste". */
export function municipalitySearchKey(name: string) {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export async function searchMunicipalities(state: BrState, q: string, take = 20) {
  const key = municipalitySearchKey(q);
  return prisma.municipality.findMany({
    where: { state, active: true, ...(key ? { searchName: { contains: key } } : {}) },
    orderBy: [{ searchName: 'asc' }],
    take,
    select: { ibgeCode: true, name: true, state: true },
  });
}

/** Resolve cidade/UF digitados livremente para o código IBGE (só quando o nome bate exatamente). */
export async function matchMunicipality(state: string, cityName: string) {
  const uf = state.trim().toUpperCase();
  if (!isBrState(uf)) return null;
  return prisma.municipality.findFirst({
    where: { state: uf, searchName: municipalitySearchKey(cityName), active: true },
    select: { ibgeCode: true, name: true, state: true },
  });
}
