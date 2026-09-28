// Pura (sem banco): pode ser importada por componentes client.
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
