'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { updateMyProfile } from '@/app/(public)/conta/_actions';
import { cn } from '@/lib/utils';
import { AddressFields, TaxRegistrationFields, type AddressValue, type TaxRegistrationValue } from '@/components/customers/FiscalFields';

interface Values { name: string; doc: string; phone: string; contact: string }

const inputCls = 'h-11 w-full rounded-xl border border-le-line bg-white px-3.5 text-sm text-le-text outline-none transition-[border-color,box-shadow] focus:border-le-blue focus:shadow-[0_0_0_4px_rgb(49_88_239/0.12)] aria-invalid:border-le-danger';

export function ProfileForm({ email, defaults, fiscal, docLocked }: { email: string; defaults: Values; fiscal: AddressValue & TaxRegistrationValue; docLocked: boolean }) {
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<{ ok?: string; error?: string; field?: string }>({});
  const [fiscalValues, setFiscalValues] = useState(fiscal);
  const patch = (p: Partial<AddressValue & TaxRegistrationValue>) => setFiscalValues((v) => ({ ...v, ...p }));
  const fieldErrors = status.field && status.error ? { [status.field]: status.error } : {};

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await updateMyProfile(fd);
      setStatus('error' in res ? { error: res.error, field: res.field } : { ok: res.message });
    });
  }

  const f = (name: keyof Values, label: string, props: React.ComponentProps<'input'> = {}, span = '') => (
    <label className={cn('block space-y-1.5', span)}>
      <span className="text-xs font-medium text-le-text">{label}</span>
      <input name={name} defaultValue={defaults[name]} aria-invalid={status.field === name || undefined} className={inputCls} {...props} />
    </label>
  );

  return (
    <form onSubmit={submit} className="max-w-3xl space-y-8">
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-sm font-semibold text-le-text">Identificação</legend>
        {f('name', 'Nome ou razão social', { required: true, autoComplete: 'organization' }, 'sm:col-span-2')}
        {f('doc', 'CPF ou CNPJ', { inputMode: 'text', autoCapitalize: 'characters', readOnly: docLocked, placeholder: '00.000.000/0000-00' })}
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-le-text">E-mail de acesso</span>
          <input value={email} readOnly className={cn(inputCls, 'bg-le-subtle text-le-muted')} />
        </label>
        {f('phone', 'WhatsApp / telefone', { inputMode: 'tel', autoComplete: 'tel', placeholder: '(62) 90000-0000' })}
        {f('contact', 'Pessoa de contato', { autoComplete: 'name' })}
      </fieldset>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-sm font-semibold text-le-text">Dados para a nota fiscal</legend>
        <TaxRegistrationFields variant="account" customerFacing value={fiscalValues} onChange={patch} errors={fieldErrors} />
      </fieldset>
      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-le-text">Endereço (nota fiscal e entrega)</legend>
        <AddressFields variant="account" value={fiscalValues} onChange={patch} errors={fieldErrors} />
      </fieldset>
      {docLocked && <p className="text-xs text-le-muted">O CPF/CNPJ já está vinculado às suas cobranças. Para alterá-lo, fale com a nossa equipe.</p>}
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} aria-busy={pending} className="flex h-11 items-center gap-2 rounded-xl bg-le-blue px-6 text-sm font-semibold text-white hover:bg-le-blue-hover disabled:opacity-70">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Salvar dados
        </button>
        <p aria-live="polite" className={cn('flex items-center gap-1.5 text-sm', status.error ? 'text-le-danger' : 'text-le-success')}>
          {status.ok && <Check className="h-4 w-4" />}
          {status.error ?? status.ok}
        </p>
      </div>
    </form>
  );
}
