'use client';

import { useState, useTransition, type FormEvent } from 'react';
import type { FinanceType } from '@prisma/client';
import { Check, Loader2, MoreHorizontal, Pencil, Plus, RotateCcw, Users, X } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { centsToCurrencyInput, formatCurrency } from '@/lib/format';
import { ACCOUNTS, FINANCE_CATEGORIES, GROUP_LABELS, METHODS } from '@/lib/finance-categories';
import { cancelEntry, generatePayroll, markEntryPaid, reopenEntry, saveFinanceEntry } from '@/app/admin/financeiro/_actions';
import { cn } from '@/lib/utils';
import { toast } from '../toast';

type Result = { ok: true; message?: string } | { error: string };
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const inputCls = 'mt-1.5 h-10 w-full rounded-xl border border-le-line bg-white px-3 text-sm outline-none focus:border-le-blue focus:shadow-[0_0_0_4px_rgb(49_88_239/0.12)]';
const labelCls = 'block text-xs font-medium text-le-text';

export interface EntryDefaults {
  id?: string;
  type: FinanceType;
  category: string;
  description: string;
  amountCents: number;
  dueDate: string;
  competence?: string;
  paidAt?: string | null;
  method?: string | null;
  account?: string | null;
  supplier?: string | null;
  document?: string | null;
  notes?: string | null;
  employeeId?: string | null;
}

function EntryForm({ defaults, employees, onDone }: { defaults: EntryDefaults; employees: { id: string; name: string }[]; onDone: () => void }) {
  const [type, setType] = useState<FinanceType>(defaults.type);
  const [paid, setPaid] = useState(Boolean(defaults.paidAt));
  const [category, setCategory] = useState(defaults.category);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();
  const cats = FINANCE_CATEGORIES.filter((c) => c.type === type);
  const groups = [...new Set(cats.map((c) => c.group))];
  const isPeople = ['SALARIOS', 'COMISSOES', 'ADIANTAMENTO', 'ENCARGOS'].includes(category);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('type', type);
    fd.set('paid', String(paid));
    setError('');
    start(async () => {
      const res = await saveFinanceEntry(defaults.id ?? null, fd);
      if ('error' in res) return setError(res.error);
      toast(res.message ?? 'Salvo');
      onDone();
    });
  }

  return (
    <form onSubmit={submit} className="flex min-h-full flex-col">
      <div className="flex-1 space-y-4 p-5 sm:p-7">
        {!defaults.id && (
          <div role="radiogroup" aria-label="Tipo" className="grid grid-cols-2 gap-1 rounded-xl bg-le-subtle p-1">
            {(['DESPESA', 'RECEITA'] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={type === t}
                onClick={() => { setType(t); setCategory(FINANCE_CATEGORIES.find((c) => c.type === t)!.key); }}
                className={cn('h-10 rounded-lg text-sm font-semibold transition-colors', type === t ? (t === 'DESPESA' ? 'bg-white text-le-danger shadow-sm' : 'bg-white text-le-success shadow-sm') : 'text-le-muted')}
              >
                {t === 'DESPESA' ? '− Despesa (saída)' : '+ Receita (entrada)'}
              </button>
            ))}
          </div>
        )}
        <label className={labelCls}>
          Categoria
          <select name="category" value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
            {groups.map((g) => (
              <optgroup key={g} label={GROUP_LABELS[g]}>
                {cats.filter((c) => c.group === g).map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
        <label className={labelCls}>
          Descrição
          <input name="description" required defaultValue={defaults.description} placeholder={type === 'DESPESA' ? 'Ex.: Barras de aço 1045 — Gerdau' : 'Ex.: Serviço de usinagem avulso'} className={inputCls} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className={labelCls}>
            Valor (R$)
            <input name="amount" required inputMode="decimal" defaultValue={defaults.amountCents ? centsToCurrencyInput(defaults.amountCents) : ''} placeholder="0,00" className={inputCls} />
          </label>
          <label className={labelCls}>
            Vencimento
            <input name="dueDate" type="date" required defaultValue={defaults.dueDate} className={inputCls} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className={labelCls}>
            {type === 'DESPESA' ? 'Fornecedor / favorecido' : 'Cliente / pagador'}
            <input name="supplier" defaultValue={defaults.supplier ?? ''} className={inputCls} />
          </label>
          <label className={labelCls}>
            Nº nota / boleto
            <input name="document" defaultValue={defaults.document ?? ''} className={inputCls} />
          </label>
        </div>
        {(isPeople || defaults.employeeId) && (
          <label className={labelCls}>
            Funcionário
            <select name="employeeId" defaultValue={defaults.employeeId ?? ''} className={inputCls}>
              <option value="">—</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </label>
        )}
        <div className="grid grid-cols-2 gap-3">
          <label className={labelCls}>
            Forma
            <select name="method" defaultValue={defaults.method ?? 'PIX'} className={inputCls}>
              <option value="">—</option>
              {METHODS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          <label className={labelCls}>
            Conta
            <select name="account" defaultValue={defaults.account ?? 'Banco'} className={inputCls}>
              <option value="">—</option>
              {ACCOUNTS.map((a) => <option key={a}>{a}</option>)}
            </select>
          </label>
        </div>

        <div className="rounded-2xl border border-le-line p-4">
          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium">
            {type === 'DESPESA' ? 'Já foi pago' : 'Já foi recebido'}
            <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="h-5 w-5 accent-le-blue" />
          </label>
          {paid && (
            <label className={cn(labelCls, 'mt-3')}>
              Data do {type === 'DESPESA' ? 'pagamento' : 'recebimento'}
              <input name="paidAt" type="date" defaultValue={defaults.paidAt ?? today()} className={inputCls} />
            </label>
          )}
        </div>

        {!defaults.id && (
          <label className={labelCls}>
            Repetir todo mês
            <select name="repeat" defaultValue="1" className={inputCls}>
              <option value="1">Não repetir</option>
              {[2, 3, 6, 12, 24].map((n) => <option key={n} value={n}>{n} meses (aluguel, parcelas, assinaturas…)</option>)}
            </select>
          </label>
        )}
        <label className={labelCls}>
          Observações
          <textarea name="notes" rows={2} defaultValue={defaults.notes ?? ''} className="mt-1.5 w-full rounded-xl border border-le-line p-3 text-sm outline-none focus:border-le-blue" />
        </label>
        {defaults.competence && <input type="hidden" name="competence" value={defaults.competence} />}
      </div>
      <div className="sticky bottom-0 border-t border-le-line bg-white/95 p-4 supports-backdrop-filter:backdrop-blur sm:px-7">
        {error && <p role="alert" className="mb-2 rounded-lg bg-le-danger-surface px-3 py-2 text-xs text-le-danger">{error}</p>}
        <button type="submit" disabled={pending} aria-busy={pending} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-le-blue text-sm font-semibold text-white hover:bg-le-blue-hover disabled:opacity-70">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {defaults.id ? 'Salvar alterações' : 'Adicionar lançamento'}
        </button>
      </div>
    </form>
  );
}

export function EntrySheetButton({ defaults, employees, variant = 'primary' }: { defaults: EntryDefaults; employees: { id: string; name: string }[]; variant?: 'primary' | 'icon' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {variant === 'primary' ? (
        <button onClick={() => setOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-le-blue px-4 text-sm font-semibold text-white hover:bg-le-blue-hover">
          <Plus className="h-4 w-4" /> Novo lançamento
        </button>
      ) : (
        <button onClick={() => setOpen(true)} aria-label="Editar lançamento" className="rounded-lg p-1.5 text-le-muted hover:bg-le-subtle hover:text-le-text"><Pencil className="h-3.5 w-3.5" /></button>
      )}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:w-[min(560px,calc(100vw-3rem))]">
          <SheetHeader>
            <SheetTitle>{defaults.id ? 'Editar lançamento' : 'Novo lançamento'}</SheetTitle>
            <SheetDescription>Contas a pagar e a receber da empresa. Recebimentos de pedidos entram sozinhos.</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <EntryForm defaults={defaults} employees={employees} onDone={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

/** Ações de linha: dar baixa, desfazer baixa, cancelar. */
export function EntryRowActions({ id, type, status, amountCents, recurring, method, account }: {
  id: string; type: FinanceType; status: 'PREVISTO' | 'PAGO' | 'CANCELADO'; amountCents: number; recurring: boolean; method: string | null; account: string | null;
}) {
  const [payOpen, setPayOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState('');

  const run = (fn: () => Promise<Result>, confirmMsg?: string) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setMenu(false);
    start(async () => {
      const res = await fn();
      toast('error' in res ? res.error : (res.message ?? 'Feito'), 'error' in res ? 'error' : 'success');
    });
  };

  function pay(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError('');
    start(async () => {
      const res = await markEntryPaid(id, fd);
      if ('error' in res) return setError(res.error);
      toast(res.message ?? 'Baixa registrada');
      setPayOpen(false);
    });
  }

  return (
    <div className="relative flex items-center justify-end gap-1">
      {status === 'PREVISTO' && (
        <button onClick={() => setPayOpen(true)} disabled={pending} className={cn('inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold', type === 'DESPESA' ? 'bg-le-ink text-white hover:bg-le-ink-deep' : 'bg-le-success text-white')}>
          {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} {type === 'DESPESA' ? 'Pagar' : 'Receber'}
        </button>
      )}
      <button onClick={() => setMenu((m) => !m)} aria-label="Mais ações" aria-expanded={menu} className="rounded-lg p-1.5 text-le-muted hover:bg-le-subtle"><MoreHorizontal className="h-4 w-4" /></button>
      {menu && (
        <div role="menu" className="absolute right-0 top-9 z-20 w-56 overflow-hidden rounded-xl border border-le-line bg-white py-1 text-sm shadow-lg">
          {status === 'PAGO' && <button role="menuitem" onClick={() => run(() => reopenEntry(id), 'Desfazer a baixa deste lançamento?')} className="flex w-full items-center gap-2 px-3 py-2 hover:bg-le-subtle"><RotateCcw className="h-3.5 w-3.5" /> Desfazer baixa</button>}
          {status !== 'CANCELADO' && <button role="menuitem" onClick={() => run(() => cancelEntry(id), 'Cancelar este lançamento?')} className="flex w-full items-center gap-2 px-3 py-2 text-le-danger hover:bg-le-danger-surface"><X className="h-3.5 w-3.5" /> Cancelar lançamento</button>}
          {recurring && status === 'PREVISTO' && <button role="menuitem" onClick={() => run(() => cancelEntry(id, 'future'), 'Cancelar este e todos os próximos da recorrência?')} className="flex w-full items-center gap-2 px-3 py-2 text-le-danger hover:bg-le-danger-surface"><X className="h-3.5 w-3.5" /> Cancelar este e os próximos</button>}
        </div>
      )}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{type === 'DESPESA' ? 'Registrar pagamento' : 'Registrar recebimento'}</DialogTitle>
            <DialogDescription>Ajuste o valor se houve juros ou desconto.</DialogDescription>
          </DialogHeader>
          <form onSubmit={pay} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className={labelCls}>Data<input name="paidAt" type="date" required defaultValue={today()} className={inputCls} /></label>
              <label className={labelCls}>Valor (R$)<input name="amount" inputMode="decimal" defaultValue={centsToCurrencyInput(amountCents)} className={inputCls} /></label>
              <label className={labelCls}>Forma<select name="method" defaultValue={method ?? 'PIX'} className={inputCls}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select></label>
              <label className={labelCls}>Conta<select name="account" defaultValue={account ?? 'Banco'} className={inputCls}>{ACCOUNTS.map((a) => <option key={a}>{a}</option>)}</select></label>
            </div>
            {error && <p role="alert" className="text-xs text-le-danger">{error}</p>}
            <button type="submit" disabled={pending} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-le-blue text-sm font-semibold text-white disabled:opacity-70">
              {pending && <Loader2 className="h-4 w-4 animate-spin" />} Confirmar
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function GeneratePayrollButton({ competence, label, totalCents, count }: { competence: string; label: string; totalCents: number; count: number }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => {
        if (!window.confirm(`Gerar a folha de ${label}? ${count} funcionário(s) · ${formatCurrency(totalCents)}. Quem já tem lançamento no mês não é duplicado.`)) return;
        start(async () => {
          const res = await generatePayroll(competence);
          toast('error' in res ? res.error : (res.message ?? 'Folha gerada'), 'error' in res ? 'error' : 'success');
        });
      }}
      disabled={pending || count === 0}
      className="inline-flex h-10 items-center gap-2 rounded-xl border border-le-line bg-white px-4 text-sm font-semibold text-le-text hover:border-le-blue-border hover:text-le-blue disabled:opacity-50"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />} Gerar folha de {label}
    </button>
  );
}
