'use client';

// Campos de cadastro fiscal e endereço estruturado, compartilhados entre o admin
// (react-hook-form) e o portal do cliente (FormData nativo). Controlados: o pai
// guarda os valores; os inputs também têm `name`, então entram no FormData.
import { useEffect, useId, useRef, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import type { IeIndicator } from '@prisma/client';
import { BR_STATES, municipalitySearchKey } from '@/lib/domains/customers/br-states';
import { IE_INDICATOR_LABELS } from '@/lib/domains/customers/fiscal-readiness';
import { cn } from '@/lib/utils';

export type AddressValue = {
  postalCode: string; street: string; number: string; complement: string;
  district: string; cityName: string; state: string; municipalityCode: string;
};
export type TaxRegistrationValue = { ieIndicator: '' | IeIndicator; stateRegistration: string };

type Variant = 'admin' | 'account';
type Errors = Partial<Record<string, string | undefined>>;

const CLS: Record<Variant, { input: string; label: string; hint: string }> = {
  admin: {
    input: 'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm',
    label: 'text-sm font-medium',
    hint: 'text-xs text-muted-foreground',
  },
  account: {
    input: 'h-11 w-full rounded-xl border border-le-line bg-white px-3.5 text-sm text-le-text outline-none transition-[border-color,box-shadow] focus:border-le-blue focus:shadow-[0_0_0_4px_rgb(49_88_239/0.12)] aria-invalid:border-le-danger',
    label: 'text-xs font-medium text-le-text',
    hint: 'text-xs text-le-muted',
  },
};

function Field({ variant, label, error, hint, className, children }: {
  variant: Variant; label: string; error?: string; hint?: React.ReactNode; className?: string; children: React.ReactNode;
}) {
  const c = CLS[variant];
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className={c.label}>{label}</span>
      {children}
      {error ? <span className="block text-xs text-destructive">{error}</span> : hint ? <span className={cn('block', c.hint)}>{hint}</span> : null}
    </label>
  );
}

const formatCep = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
};

export function TaxRegistrationFields({ value, onChange, errors = {}, variant, customerFacing = false }: {
  value: TaxRegistrationValue; onChange: (patch: Partial<TaxRegistrationValue>) => void; errors?: Errors; variant: Variant; customerFacing?: boolean;
}) {
  const c = CLS[variant];
  const needsIe = value.ieIndicator === 'CONTRIBUINTE' || value.ieIndicator === 'NAO_CONTRIBUINTE';
  // No portal a pergunta é em linguagem do cliente; o valor gravado é o mesmo
  const labels: Record<IeIndicator, string> = customerFacing
    ? { CONTRIBUINTE: 'Tenho inscrição estadual (empresa ou produtor rural)', ISENTO: 'Sou isento de inscrição estadual', NAO_CONTRIBUINTE: 'Não tenho inscrição estadual' }
    : IE_INDICATOR_LABELS;
  return (
    <>
      <Field variant={variant} label={customerFacing ? 'Inscrição estadual' : 'Enquadramento no ICMS'} error={errors.ieIndicator}
        hint={customerFacing ? 'Na dúvida, pergunte ao seu contador. Isso define como a nota fiscal é emitida.' : 'Escolha do cliente/contador — não é deduzido do CPF/CNPJ.'}>
        <select name="ieIndicator" value={value.ieIndicator} aria-invalid={!!errors.ieIndicator || undefined}
          onChange={(e) => onChange({ ieIndicator: e.target.value as TaxRegistrationValue['ieIndicator'], ...(e.target.value === 'ISENTO' ? { stateRegistration: '' } : {}) })}
          className={cn(c.input, 'pr-8')}>
          <option value="">Selecione…</option>
          {(Object.keys(labels) as IeIndicator[]).map((k) => <option key={k} value={k}>{labels[k]}</option>)}
        </select>
      </Field>
      <Field variant={variant} label={value.ieIndicator === 'NAO_CONTRIBUINTE' ? 'Nº da IE (se tiver)' : 'Nº da inscrição estadual'} error={errors.stateRegistration}
        hint={value.ieIndicator === 'ISENTO' ? 'Isento não informa número de IE.' : 'Com os zeros à esquerda, como no cartão da IE.'}>
        <input name="stateRegistration" value={value.stateRegistration} disabled={!needsIe} inputMode="text" autoCapitalize="characters"
          aria-invalid={!!errors.stateRegistration || undefined} onChange={(e) => onChange({ stateRegistration: e.target.value })}
          className={cn(c.input, !needsIe && 'opacity-60')} />
      </Field>
    </>
  );
}

type Suggestion = { ibgeCode: string; name: string; state: string };

export function AddressFields({ value, onChange, errors = {}, variant }: {
  value: AddressValue; onChange: (patch: Partial<AddressValue>) => void; errors?: Errors; variant: Variant;
}) {
  const c = CLS[variant];
  const listId = useId();
  const [cepStatus, setCepStatus] = useState<{ loading?: boolean; error?: string }>({});
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const lastCep = useRef(value.postalCode.replace(/\D/g, ''));

  async function lookupCep(cep: string) {
    setCepStatus({ loading: true });
    try {
      const res = await fetch(`/api/cep/${cep}`);
      const data = await res.json();
      if (!res.ok) return setCepStatus({ error: data.error ?? 'CEP não encontrado.' });
      onChange({
        street: data.street || value.street,
        district: data.district || value.district,
        cityName: data.cityName, state: data.state, municipalityCode: data.municipalityCode,
      });
      setCepStatus({});
    } catch {
      setCepStatus({ error: 'Sem conexão para consultar o CEP. Preencha manualmente.' });
    }
  }

  // Sugestões de município da UF escolhida (catálogo IBGE)
  useEffect(() => {
    if (!value.state || value.cityName.trim().length < 2 || value.municipalityCode) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/municipalities?uf=${value.state}&q=${encodeURIComponent(value.cityName)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((d: { items: Suggestion[] }) => {
          setSuggestions(d.items);
          const exact = d.items.find((s) => municipalitySearchKey(s.name) === municipalitySearchKey(value.cityName));
          if (exact) onChange({ cityName: exact.name, municipalityCode: exact.ibgeCode });
        })
        .catch(() => {});
    }, 250);
    return () => { clearTimeout(t); ctrl.abort(); };
    // onChange muda a cada render do pai; a busca depende só de UF e texto
  }, [value.state, value.cityName, value.municipalityCode]);

  const cityError = errors.city ?? errors.cityName ?? errors.municipalityCode;

  return (
    <div className="grid gap-4 sm:grid-cols-6">
      <Field variant={variant} label="CEP" error={errors.postalCode ?? cepStatus.error} className="sm:col-span-2"
        hint={cepStatus.loading ? <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Buscando endereço…</span> : 'Preenche rua, bairro e cidade.'}>
        <input name="postalCode" value={formatCep(value.postalCode)} inputMode="numeric" autoComplete="postal-code" placeholder="00000-000"
          aria-invalid={!!errors.postalCode || undefined}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
            onChange({ postalCode: digits });
            if (digits.length === 8 && digits !== lastCep.current) { lastCep.current = digits; void lookupCep(digits); }
          }}
          className={c.input} />
      </Field>
      <Field variant={variant} label="Logradouro" error={errors.street} className="sm:col-span-4">
        <input name="street" value={value.street} autoComplete="address-line1" aria-invalid={!!errors.street || undefined}
          onChange={(e) => onChange({ street: e.target.value })} className={c.input} />
      </Field>
      <Field variant={variant} label="Número" error={errors.number} hint='Sem número? Use "S/N".' className="sm:col-span-2">
        <input name="number" value={value.number} aria-invalid={!!errors.number || undefined}
          onChange={(e) => onChange({ number: e.target.value })} className={c.input} />
      </Field>
      <Field variant={variant} label="Complemento" className="sm:col-span-4">
        <input name="complement" value={value.complement} autoComplete="address-line2"
          onChange={(e) => onChange({ complement: e.target.value })} className={c.input} />
      </Field>
      <Field variant={variant} label="Bairro" error={errors.district} className="sm:col-span-2">
        <input name="district" value={value.district} aria-invalid={!!errors.district || undefined}
          onChange={(e) => onChange({ district: e.target.value })} className={c.input} />
      </Field>
      <Field variant={variant} label="UF" error={errors.state} className="sm:col-span-1">
        <select name="state" value={value.state} autoComplete="address-level1" aria-invalid={!!errors.state || undefined}
          onChange={(e) => onChange({ state: e.target.value, municipalityCode: '' })} className={c.input}>
          <option value="">—</option>
          {BR_STATES.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
        </select>
      </Field>
      <Field variant={variant} label="Cidade" error={cityError} className="sm:col-span-3"
        hint={value.municipalityCode
          ? <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> Município IBGE {value.municipalityCode}</span>
          : value.state ? 'Escolha a cidade na lista.' : 'Escolha a UF primeiro.'}>
        <input name="cityName" value={value.cityName} list={listId} autoComplete="address-level2" disabled={!value.state}
          aria-invalid={!!cityError || undefined}
          onChange={(e) => onChange({ cityName: e.target.value, municipalityCode: '' })}
          className={cn(c.input, !value.state && 'opacity-60')} />
        <datalist id={listId}>{suggestions.map((s) => <option key={s.ibgeCode} value={s.name} />)}</datalist>
      </Field>
      <input type="hidden" name="municipalityCode" value={value.municipalityCode} />
    </div>
  );
}
