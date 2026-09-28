// Consulta ao catálogo de municípios do IBGE (tabela Municipality).
import { prisma } from '@/lib/db';
import { isBrState, municipalitySearchKey, type BrState } from './br-states';

export { BR_STATES, isBrState, municipalitySearchKey, type BrState } from './br-states';

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
