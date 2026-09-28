// Diagnóstico do cadastro para faturamento (NF-e de mercadorias). Função pura:
// lista o que falta, não inventa dado ausente. "Pronto" aqui significa dados
// completos e coerentes, NÃO garantia de autorização pela SEFAZ (§5 do plano).
import type { IeIndicator } from '@prisma/client';
import { parseTaxId, type TaxIdKind } from './tax-id';

export type FiscalField =
  | 'name' | 'doc' | 'ieIndicator' | 'stateRegistration' | 'email'
  | 'postalCode' | 'street' | 'number' | 'district' | 'city' | 'state';

export type FiscalIssue = { field: FiscalField; message: string };

export type FiscalCustomerInput = {
  name: string | null;
  doc: string | null;
  email?: string | null;
  ieIndicator: IeIndicator | null;
  stateRegistration: string | null;
};

export type FiscalAddressInput = {
  postalCode: string | null;
  street: string | null;
  number: string | null;
  district: string | null;
  municipalityCode: string | null;
  state: string | null;
  /** UF do município do catálogo IBGE, quando vinculado */
  municipalityState?: string | null;
} | null;

export type FiscalReadiness = {
  ready: boolean;
  personKind: TaxIdKind | null;
  /** Impedem faturar */
  issues: FiscalIssue[];
  /** Recomendados (ex.: e-mail para enviar XML/DANFE) */
  warnings: FiscalIssue[];
};

export const IE_INDICATOR_LABELS: Record<IeIndicator, string> = {
  CONTRIBUINTE: 'Contribuinte do ICMS (tem IE)',
  ISENTO: 'Contribuinte isento de IE',
  NAO_CONTRIBUINTE: 'Não contribuinte',
};

/** Só dígitos; CEP brasileiro tem 8. */
export const normalizePostalCode = (raw: string) => raw.replace(/\D/g, '');

/** IE como texto: mantém zeros e letras (ex.: produtor rural "P…" em SP), sem pontuação. */
export const normalizeStateRegistration = (raw: string) => raw.toUpperCase().replace(/[^0-9A-Z]/g, '');

const blank = (v: string | null | undefined) => !v || !v.trim();

export function fiscalReadiness(c: FiscalCustomerInput, a: FiscalAddressInput): FiscalReadiness {
  const issues: FiscalIssue[] = [];
  const warnings: FiscalIssue[] = [];
  const add = (field: FiscalField, message: string) => issues.push({ field, message });

  if (blank(c.name) || c.name!.trim().length < 2) add('name', 'Informe o nome ou a razão social.');

  let personKind: TaxIdKind | null = null;
  if (blank(c.doc)) add('doc', 'Informe o CPF ou CNPJ.');
  else {
    const t = parseTaxId(c.doc!);
    if (t.ok) personKind = t.kind;
    else add('doc', t.reason);
  }

  // Enquadramento é escolha do cliente/contador — nunca deduzido do CPF/CNPJ
  const ie = c.stateRegistration ? normalizeStateRegistration(c.stateRegistration) : '';
  if (!c.ieIndicator) add('ieIndicator', 'Informe se o cliente é contribuinte do ICMS, isento ou não contribuinte.');
  else if (c.ieIndicator === 'CONTRIBUINTE') {
    if (!ie) add('stateRegistration', 'Contribuinte do ICMS precisa da inscrição estadual.');
    else if (ie === 'ISENTO') add('stateRegistration', 'Com IE "isento", escolha o enquadramento "Contribuinte isento de IE".');
    else if (ie.length < 2 || ie.length > 14) add('stateRegistration', 'Inscrição estadual deve ter de 2 a 14 caracteres.');
  } else if (c.ieIndicator === 'ISENTO' && ie && ie !== 'ISENTO') {
    add('stateRegistration', 'Contribuinte isento não informa número de IE na nota. Remova a IE ou mude o enquadramento.');
  }

  if (!a) {
    add('postalCode', 'Cadastre o endereço fiscal.');
  } else {
    const cep = a.postalCode ? normalizePostalCode(a.postalCode) : '';
    if (!cep) add('postalCode', 'Informe o CEP.');
    else if (cep.length !== 8) add('postalCode', 'CEP deve ter 8 dígitos.');
    if (blank(a.street)) add('street', 'Informe o logradouro.');
    if (blank(a.number)) add('number', 'Informe o número (ou "S/N").');
    if (blank(a.district)) add('district', 'Informe o bairro.');
    if (blank(a.state)) add('state', 'Informe a UF.');
    if (!a.municipalityCode) add('city', 'Selecione o município (código IBGE).');
    else if (a.municipalityState && a.state && a.municipalityState !== a.state) {
      add('city', `O município selecionado é de ${a.municipalityState}, mas a UF informada é ${a.state}.`);
    }
  }

  if (blank(c.email)) warnings.push({ field: 'email', message: 'Sem e-mail: o XML e o DANFE não poderão ser enviados automaticamente.' });

  return { ready: issues.length === 0, personKind, issues, warnings };
}
