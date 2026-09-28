// Cadastro fiscal + endereço PRINCIPAL do cliente (server-only, NÃO é Server Action).
// Usado pelo admin (/admin/clientes) e pelo portal (/conta/dados).
import type { Customer, CustomerAddress, IeIndicator, Municipality, Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { isBrState, matchMunicipality } from './municipalities';
import {
  fiscalReadiness, normalizePostalCode, normalizeStateRegistration, type FiscalReadiness,
} from './fiscal-readiness';

type Db = Prisma.TransactionClient | typeof prisma;

const opt = (max: number) => z.string().trim().max(max).optional().or(z.literal(''));

/** Campos planos enviados pelos formulários (FormData). */
export const fiscalProfileFields = {
  tradeName: opt(160),
  ieIndicator: z.enum(['', 'CONTRIBUINTE', 'ISENTO', 'NAO_CONTRIBUINTE']).optional(),
  stateRegistration: opt(20),
  postalCode: opt(10),
  street: opt(160),
  number: opt(20),
  complement: opt(80),
  district: opt(80),
  cityName: opt(80),
  state: opt(2),
  municipalityCode: opt(7),
};

const fiscalProfileSchema = z.object(fiscalProfileFields);
export type FiscalProfileInput = z.infer<typeof fiscalProfileSchema>;

export type FieldError = { field: keyof FiscalProfileInput; message: string };

type ResolvedProfile = {
  customer: { tradeName: string | null; ieIndicator: IeIndicator | null; stateRegistration: string | null };
  address: {
    postalCode: string | null; street: string | null; number: string | null; complement: string | null;
    district: string | null; cityName: string | null; state: string | null; municipalityCode: string | null;
  };
};

const orNull = (v: string | undefined) => (v && v.trim() ? v.trim() : null);

/**
 * Valida o que é FORMATO (CEP, UF) e resolve o município no catálogo IBGE.
 * Dado ausente não é erro aqui: o cadastro pode ficar incompleto e o que
 * faltar aparece como pendência fiscal.
 */
export async function resolveFiscalProfile(input: FiscalProfileInput): Promise<ResolvedProfile | FieldError> {
  const cep = input.postalCode ? normalizePostalCode(input.postalCode) : '';
  if (cep && cep.length !== 8) return { field: 'postalCode', message: 'CEP deve ter 8 dígitos.' };
  const state = input.state ? input.state.trim().toUpperCase() : '';
  if (state && !isBrState(state)) return { field: 'state', message: 'UF inválida.' };

  let municipality: Pick<Municipality, 'ibgeCode' | 'name' | 'state'> | null = null;
  const code = orNull(input.municipalityCode);
  if (code) {
    municipality = await prisma.municipality.findFirst({
      where: { ibgeCode: code, active: true },
      select: { ibgeCode: true, name: true, state: true },
    });
    // Código de outra UF (usuário trocou a UF depois de escolher a cidade): ignora o código
    if (municipality && state && municipality.state !== state) municipality = null;
  }
  if (!municipality && state && input.cityName?.trim()) municipality = await matchMunicipality(state, input.cityName);

  const ie = input.stateRegistration ? normalizeStateRegistration(input.stateRegistration) : '';
  return {
    customer: {
      tradeName: orNull(input.tradeName),
      ieIndicator: input.ieIndicator ? input.ieIndicator : null,
      stateRegistration: ie || null,
    },
    address: {
      postalCode: cep || null,
      street: orNull(input.street),
      number: orNull(input.number)?.toUpperCase() === 'SN' ? 'S/N' : orNull(input.number),
      complement: orNull(input.complement),
      district: orNull(input.district),
      cityName: municipality?.name ?? orNull(input.cityName),
      state: municipality?.state ?? (state || null),
      municipalityCode: municipality?.ibgeCode ?? null,
    },
  };
}

/** Linha única para os campos antigos (PDF, Asaas, listagens). */
export function addressLine(a: { street: string | null; number: string | null; complement: string | null; district: string | null }) {
  const first = [a.street, a.number].filter(Boolean).join(', ');
  return [first, a.complement, a.district].filter(Boolean).join(' - ') || null;
}

/** Grava o perfil fiscal e o endereço PRINCIPAL, espelhando nos campos livres. */
export async function saveFiscalProfile(db: Db, customerId: string, p: ResolvedProfile) {
  const hasAddress = Object.values(p.address).some(Boolean);
  await db.customer.update({
    where: { id: customerId },
    data: {
      ...p.customer,
      address: addressLine(p.address),
      city: p.address.cityName,
      state: p.address.state,
      zip: p.address.postalCode,
    },
  });
  if (hasAddress) {
    await db.customerAddress.upsert({
      where: { customerId_kind: { customerId, kind: 'PRINCIPAL' } },
      create: { customerId, kind: 'PRINCIPAL', ...p.address },
      update: p.address,
    });
  } else {
    await db.customerAddress.deleteMany({ where: { customerId, kind: 'PRINCIPAL' } });
  }
}

export type CustomerWithAddresses = Customer & {
  addresses: (CustomerAddress & { municipality: Pick<Municipality, 'state'> | null })[];
};

export const principalAddressInclude = {
  addresses: { where: { kind: 'PRINCIPAL' as const }, include: { municipality: { select: { state: true } } } },
};

export function customerFiscalReadiness(c: CustomerWithAddresses): FiscalReadiness {
  const a = c.addresses.find((x) => x.kind === 'PRINCIPAL') ?? null;
  return fiscalReadiness(
    { name: c.name, doc: c.doc, email: c.email, ieIndicator: c.ieIndicator, stateRegistration: c.stateRegistration },
    a && { ...a, municipalityState: a.municipality?.state ?? null },
  );
}

/** Valores iniciais dos formulários a partir do cadastro (com fallback para os campos livres antigos). */
export function fiscalFormDefaults(c: CustomerWithAddresses) {
  const a = c.addresses.find((x) => x.kind === 'PRINCIPAL');
  return {
    tradeName: c.tradeName ?? '',
    ieIndicator: (c.ieIndicator ?? '') as '' | IeIndicator,
    stateRegistration: c.stateRegistration ?? '',
    postalCode: a?.postalCode ?? c.zip ?? '',
    street: a?.street ?? (a ? '' : c.address ?? ''),
    number: a?.number ?? '',
    complement: a?.complement ?? '',
    district: a?.district ?? '',
    cityName: a?.cityName ?? c.city ?? '',
    state: a?.state ?? c.state ?? '',
    municipalityCode: a?.municipalityCode ?? '',
  };
}
