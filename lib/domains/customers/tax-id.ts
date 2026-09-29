// CPF e CNPJ (numérico e alfanumérico). Forma canônica = só [0-9A-Z], sem
// pontuação. O CNPJ alfanumérico (Receita, 2026) tem 12 posições [0-9A-Z] e
// 2 dígitos verificadores numéricos; o valor de cada caractere no cálculo é
// o código ASCII − 48, o que mantém os CNPJs antigos válidos pela mesma conta.

export type TaxIdKind = 'CPF' | 'CNPJ';

export type TaxIdResult =
  | { ok: true; kind: TaxIdKind; value: string }
  | { ok: false; reason: string };

/**
 * Remove pontuação/espaços e põe letras em maiúsculas. Não converte letras em
 * números. Tolera rótulo digitado junto ("CPF: 529…", "CNPJ 11.222…"), comum
 * nos cadastros antigos.
 */
export function normalizeTaxId(raw: string) {
  return raw
    .trim()
    .replace(/^(CPF|CNPJ)(\s*\/\s*(CPF|CNPJ))?\s*[:.\-]?\s*/i, '')
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '');
}

const charValue = (c: string) => c.charCodeAt(0) - 48;

function cpfDigit(base: string) {
  const len = base.length;
  let sum = 0;
  for (let i = 0; i < len; i++) sum += Number(base[i]) * (len + 1 - i);
  const r = (sum * 10) % 11;
  return r === 10 ? 0 : r;
}

function cnpjDigit(base: string) {
  // Pesos 2..9 da direita para a esquerda, reiniciando em 2
  let sum = 0;
  let weight = 2;
  for (let i = base.length - 1; i >= 0; i--) {
    sum += charValue(base[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const r = sum % 11;
  return r < 2 ? 0 : 11 - r;
}

export function parseTaxId(raw: string): TaxIdResult {
  const v = normalizeTaxId(raw);
  if (!v) return { ok: false, reason: 'Informe o CPF ou CNPJ.' };

  if (/^\d{11}$/.test(v)) {
    if (/^(\d)\1{10}$/.test(v)) return { ok: false, reason: 'CPF inválido.' };
    const ok = cpfDigit(v.slice(0, 9)) === Number(v[9]) && cpfDigit(v.slice(0, 10)) === Number(v[10]);
    return ok ? { ok: true, kind: 'CPF', value: v } : { ok: false, reason: 'CPF inválido (dígito verificador).' };
  }

  if (/^[0-9A-Z]{12}\d{2}$/.test(v)) {
    if (/^(\d)\1{13}$/.test(v)) return { ok: false, reason: 'CNPJ inválido.' };
    const ok = cnpjDigit(v.slice(0, 12)) === Number(v[12]) && cnpjDigit(v.slice(0, 13)) === Number(v[13]);
    return ok ? { ok: true, kind: 'CNPJ', value: v } : { ok: false, reason: 'CNPJ inválido (dígito verificador).' };
  }

  if (v.length === 11) return { ok: false, reason: 'CPF só tem números.' };
  if (v.length === 14) return { ok: false, reason: 'CNPJ: letras só nas 12 primeiras posições; os 2 últimos são números.' };
  return { ok: false, reason: 'CPF tem 11 dígitos; CNPJ tem 14 caracteres.' };
}

export function isValidTaxId(raw: string) {
  return parseTaxId(raw).ok;
}

/** Formata para exibição; se não for um documento válido, devolve o texto original. */
export function formatTaxId(raw: string) {
  const r = parseTaxId(raw);
  if (!r.ok) return raw;
  const v = r.value;
  return r.kind === 'CPF'
    ? `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9)}`
    : `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8, 12)}-${v.slice(12)}`;
}

/** Exibe somente o prefixo e os verificadores; dados inválidos nunca vazam. */
export function maskTaxId(raw: string) {
  const result = parseTaxId(raw);
  if (!result.ok) return '•••.•••.•••-••';
  return result.kind === 'CPF'
    ? `${result.value.slice(0, 3)}.•••.•••-${result.value.slice(-2)}`
    : `${result.value.slice(0, 2)}.•••.•••/••••-${result.value.slice(-2)}`;
}

/** Mesmo documento independentemente da pontuação/caixa com que foi digitado. */
export function sameTaxId(a: string | null | undefined, b: string | null | undefined) {
  if (!a || !b) return false;
  return normalizeTaxId(a) === normalizeTaxId(b);
}
