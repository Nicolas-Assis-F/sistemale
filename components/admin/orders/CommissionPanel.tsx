'use client';

import { useState, useTransition, type FormEvent } from 'react';
import type { CommissionRole, CommissionStatus } from '@prisma/client';
import { BadgePercent, Loader2, Plus, Trash2, Unlock } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import {
  COMMISSION_ROLE_LABELS, COMMISSION_STATUS_BADGE, COMMISSION_STATUS_LABELS, formatBps,
} from '@/lib/finance-labels';
import { addOrderCommission, releaseCommission, removeCommission } from '@/app/admin/comissoes/_actions';
import { cn } from '@/lib/utils';
import { toast } from '../toast';

export interface CommissionRow {
  id: string;
  employeeName: string;
  role: CommissionRole;
  bps: number;
  amountCents: number;
  status: CommissionStatus;
}

interface Props {
  orderId: string;
  orderCancelled: boolean;
  totalCents: number;
  commissions: CommissionRow[];
  employees: { id: string; name: string; commissionBps: number }[];
}

const ROLES: CommissionRole[] = ['VENDA', 'PRODUCAO', 'INDICACAO', 'OUTRO'];
const inputCls = 'h-9 w-full rounded-lg border border-le-line bg-white px-2.5 text-xs outline-none focus:border-le-blue';

type Result = { ok: true; message?: string } | { error: string };

export function CommissionPanel({ orderId, orderCancelled, totalCents, commissions, employees }: Props) {
  const [adding, setAdding] = useState(false);
  const [percent, setPercent] = useState('');
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const total = commissions.filter((c) => c.status !== 'CANCELADA').reduce((s, c) => s + c.amountCents, 0);

  function act(fn: () => Promise<Result>, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    start(async () => {
      const res = await fn();
      toast('error' in res ? res.error : (res.message ?? 'Feito'), 'error' in res ? 'error' : 'success');
    });
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError('');
    start(async () => {
      const res = await addOrderCommission(orderId, fd);
      if ('error' in res) return setError(res.error);
      toast(res.message ?? 'Comissão adicionada');
      setAdding(false);
      setPercent('');
    });
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-le-line bg-white">
      <header className="flex items-center justify-between gap-3 border-b border-le-line px-5 py-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold"><BadgePercent className="h-4 w-4 text-le-blue" /> Comissões</h2>
        <span className="text-xs text-le-muted">{formatCurrency(total)}</span>
      </header>

      <ul className="divide-y divide-le-line">
        {commissions.length === 0 && !adding && (
          <li className="px-5 py-5 text-center text-xs leading-5 text-le-muted">
            Nenhum funcionário comissionado.
            <br />A comissão é liberada quando o pedido é quitado.
          </li>
        )}
        {commissions.map((c) => (
          <li key={c.id} className={cn('flex items-center gap-3 px-5 py-3', c.status === 'CANCELADA' && 'opacity-55')}>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{c.employeeName}</p>
              <p className="text-[11px] text-le-muted">{COMMISSION_ROLE_LABELS[c.role]} · {formatBps(c.bps)} · {formatCurrency(c.amountCents)}</p>
            </div>
            <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold', COMMISSION_STATUS_BADGE[c.status])} title={COMMISSION_STATUS_LABELS[c.status]}>
              {c.status === 'PENDENTE' ? 'Pendente' : COMMISSION_STATUS_LABELS[c.status]}
            </span>
            {c.status === 'PENDENTE' && (
              <button
                onClick={() => act(() => releaseCommission(c.id), 'Liberar esta comissão antes da quitação do pedido?')}
                title="Liberar agora"
                aria-label={`Liberar comissão de ${c.employeeName}`}
                className="rounded-md p-1.5 text-le-muted hover:bg-le-subtle hover:text-le-blue"
              >
                <Unlock className="h-3.5 w-3.5" />
              </button>
            )}
            {c.status !== 'PAGA' && (
              <button
                onClick={() => act(() => removeCommission(c.id), `Remover a comissão de ${c.employeeName}?`)}
                aria-label={`Remover comissão de ${c.employeeName}`}
                className="rounded-md p-1.5 text-le-muted hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </li>
        ))}
      </ul>

      {!orderCancelled && (
        <div className="border-t border-le-line px-5 py-4">
          {adding ? (
            <form onSubmit={submit} className="space-y-2.5">
              <select
                name="employeeId"
                required
                defaultValue=""
                onChange={(e) => {
                  const emp = employees.find((x) => x.id === e.target.value);
                  if (emp && !percent) setPercent(emp.commissionBps ? String(emp.commissionBps / 100).replace('.', ',') : '');
                }}
                className={inputCls}
              >
                <option value="" disabled>Funcionário…</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name}{e.commissionBps ? ` (${formatBps(e.commissionBps)})` : ''}</option>)}
              </select>
              <div className="grid grid-cols-[1fr_96px] gap-2">
                <select name="role" defaultValue="VENDA" className={inputCls}>
                  {ROLES.map((r) => <option key={r} value={r}>{COMMISSION_ROLE_LABELS[r]}</option>)}
                </select>
                <div className="relative">
                  <input name="percent" value={percent} onChange={(e) => setPercent(e.target.value)} inputMode="decimal" placeholder="2,5" required className={cn(inputCls, 'pr-6')} />
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-le-muted">%</span>
                </div>
              </div>
              {percent && totalCents > 0 && (
                <p className="text-[11px] text-le-muted">
                  ≈ {formatCurrency(Math.round((totalCents * Number(percent.replace(',', '.') || 0)) / 100))} sobre {formatCurrency(totalCents)}
                </p>
              )}
              {error && <p className="text-[11px] text-red-600">{error}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setAdding(false)} className="h-9 flex-1 rounded-lg text-xs text-le-muted hover:bg-le-subtle">Cancelar</button>
                <button type="submit" disabled={pending} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-le-ink text-xs font-semibold text-white disabled:opacity-60">
                  {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Adicionar
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setAdding(true)}
              disabled={employees.length === 0}
              className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-le-line text-xs font-medium text-le-muted transition-colors hover:border-le-blue hover:text-le-blue disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" /> {employees.length ? 'Adicionar comissão' : 'Cadastre funcionários ativos'}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
