'use client';

import { useEffect, useMemo, useState, useTransition, type FormEvent } from 'react';
import { CalendarClock, CheckCircle2, Copy, Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { centsToCurrencyInput, formatCurrency, parseCurrencyToCents } from '@/lib/format';
import { BILLING_RULES, buildPlan, evaluateEligibility, minDownCents, type CustomerCredit } from '@/lib/billing/plan';
import { createPaymentPlan, getPlanContext } from '@/app/admin/pedidos/_payment-actions';
import { cn } from '@/lib/utils';
import { toast } from '../toast';

const iso = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d);
const plusDays = (n: number) => iso(new Date(Date.now() + n * 86_400_000));
const br = (d: string) => d.split('-').reverse().join('/');
const inputCls = 'mt-1.5 h-10 w-full rounded-xl border border-le-line bg-white px-3 text-sm outline-none focus:border-le-blue focus:shadow-[0_0_0_4px_rgb(49_88_239/0.12)]';

/**
 * Simulador + emissão do parcelamento com entrada. A análise (quem pode parcelar
 * e em quantas vezes) vem de lib/billing/plan.ts e é refeita no servidor.
 */
export function PaymentPlanDialog({ orderId, open, onOpenChange }: { orderId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [ctx, setCtx] = useState<{ balanceCents: number; credit: CustomerCredit } | null>(null);
  const [loadError, setLoadError] = useState('');
  const [down, setDown] = useState('');
  const [n, setN] = useState(1);
  const [downMethod, setDownMethod] = useState<'PIX' | 'CLIENTE_ESCOLHE' | 'BOLETO'>('PIX');
  const [downDue, setDownDue] = useState(plusDays(2));
  const [firstDue, setFirstDue] = useState(plusDays(32));
  const [override, setOverride] = useState(false);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    setCtx(null); setLoadError(''); setError(''); setOverride(false);
    getPlanContext(orderId).then((r) => {
      if ('error' in r) return setLoadError(r.error);
      setCtx(r);
      // Sugestão: entrada mínima arredondada para cima em R$ 100
      setDown(centsToCurrencyInput(Math.ceil(minDownCents(r.balanceCents) / 10_000) * 10_000));
      const elig = evaluateEligibility(r.balanceCents, r.credit);
      setN(Math.max(1, elig.maxInstallments));
    });
  }, [open, orderId]);

  const elig = ctx ? evaluateEligibility(ctx.balanceCents, ctx.credit) : null;
  const downCents = parseCurrencyToCents(down);
  const plan = useMemo(
    () => (ctx ? buildPlan({ balanceCents: ctx.balanceCents, downCents, installments: n, downDueDate: downDue, firstInstallmentDate: firstDue }) : null),
    [ctx, downCents, n, downDue, firstDue],
  );
  const downPct = ctx?.balanceCents ? (downCents / ctx.balanceCents) * 100 : 0;
  const summaryText = plan && !plan.error && ctx
    ? `Proposta L&E: total ${formatCurrency(ctx.balanceCents)} — entrada de ${formatCurrency(plan.lines[0].amountCents)} até ${br(plan.lines[0].dueDate)} + ${n}x de ${formatCurrency(plan.lines[1].amountCents)} no boleto (${plan.lines.slice(1).map((l) => br(l.dueDate)).join(', ')}). Após o vencimento: multa de ${BILLING_RULES.finePercent}% e juros de ${BILLING_RULES.interestPercent}% ao mês.`
    : '';

  function submit(e: FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    Object.entries({ down, installments: String(n), downMethod, downDueDate: downDue, firstInstallmentDate: firstDue, override: String(override) }).forEach(([k, v]) => fd.append(k, v));
    setError('');
    start(async () => {
      const res = await createPaymentPlan(orderId, fd);
      if ('error' in res) return setError(res.error);
      toast(res.message ?? 'Parcelamento emitido');
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Parcelar com entrada</DialogTitle>
          <DialogDescription>
            Entrada mínima de {BILLING_RULES.minDownPercent}% + até {BILLING_RULES.maxInstallments} boletos mensais. Cada parcela vira uma cobrança no Asaas, com lembretes automáticos, multa de {BILLING_RULES.finePercent}% e juros de {BILLING_RULES.interestPercent}% a.m. após o vencimento.
          </DialogDescription>
        </DialogHeader>

        {loadError && <p className="rounded-lg bg-le-danger-surface p-3 text-sm text-le-danger">{loadError}</p>}
        {!ctx && !loadError && <p className="flex items-center gap-2 py-6 text-sm text-le-muted"><Loader2 className="h-4 w-4 animate-spin" /> Analisando o histórico do cliente…</p>}

        {ctx && elig && (
          <form onSubmit={submit} className="space-y-5">
            {/* Análise de crédito */}
            <div className={cn('rounded-2xl border p-4', elig.eligible ? 'border-le-success/30 bg-le-success-surface' : 'border-le-warning/30 bg-le-warning-surface')}>
              <p className="flex items-center gap-2 text-sm font-semibold">
                {elig.eligible ? <ShieldCheck className="h-4 w-4 text-le-success" /> : <ShieldAlert className="h-4 w-4 text-le-warning" />}
                {elig.eligible ? `Cliente apto a parcelar em até ${elig.maxInstallments}x` : 'Parcelamento não recomendado'}
              </p>
              <ul className="mt-2 space-y-0.5 text-xs text-le-text">
                {elig.reasons.map((r) => <li key={r}>• {r}</li>)}
                <li>• Total já pago pelo cliente: {formatCurrency(ctx.credit.paidCents)}</li>
              </ul>
              {!elig.eligible && elig.maxInstallments > 0 && (
                <label className="mt-3 flex items-center gap-2 text-xs font-medium">
                  <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} className="h-4 w-4 accent-le-blue" />
                  Liberar mesmo assim (decisão do gestor)
                </label>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-medium">
                Saldo a parcelar
                <input value={formatCurrency(ctx.balanceCents)} readOnly className={cn(inputCls, 'bg-le-subtle font-semibold')} />
              </label>
              <label className="block text-xs font-medium">
                Entrada (R$) · mín. {formatCurrency(minDownCents(ctx.balanceCents))}
                <input value={down} onChange={(e) => setDown(e.target.value)} inputMode="decimal" className={inputCls} />
                <span className={cn('mt-1 block text-[11px]', downPct < BILLING_RULES.minDownPercent ? 'text-le-danger' : 'text-le-muted')}>{downPct.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% do saldo</span>
              </label>
              <label className="block text-xs font-medium">
                Entrada via
                <select value={downMethod} onChange={(e) => setDownMethod(e.target.value as typeof downMethod)} className={inputCls}>
                  <option value="PIX">PIX</option>
                  <option value="CLIENTE_ESCOLHE">Cliente escolhe (PIX, boleto ou cartão)</option>
                  <option value="BOLETO">Boleto</option>
                </select>
              </label>
              <label className="block text-xs font-medium">
                Vencimento da entrada
                <input type="date" value={downDue} onChange={(e) => setDownDue(e.target.value)} className={inputCls} />
              </label>
              <div className="block text-xs font-medium">
                Parcelas no boleto
                <div className="mt-1.5 flex gap-1.5">
                  {Array.from({ length: BILLING_RULES.maxInstallments }, (_, i) => i + 1).map((k) => (
                    <button
                      key={k}
                      type="button"
                      disabled={k > elig.maxInstallments}
                      onClick={() => setN(k)}
                      aria-pressed={n === k}
                      className={cn('h-10 flex-1 rounded-xl border text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-30', n === k ? 'border-le-blue bg-le-blue text-white' : 'border-le-line hover:border-le-blue-border')}
                    >
                      {k}x
                    </button>
                  ))}
                </div>
              </div>
              <label className="block text-xs font-medium">
                1ª parcela vence em
                <input type="date" value={firstDue} onChange={(e) => setFirstDue(e.target.value)} className={inputCls} />
              </label>
            </div>

            {/* Prévia */}
            {plan?.error ? (
              <p className="rounded-lg bg-le-danger-surface px-3 py-2 text-sm text-le-danger">{plan.error}</p>
            ) : plan && (
              <div className="overflow-hidden rounded-2xl border border-le-line">
                <table className="w-full text-sm">
                  <thead className="bg-le-subtle text-left text-[11px] uppercase tracking-wider text-le-muted">
                    <tr><th className="px-4 py-2 font-medium">Cobrança</th><th className="px-4 py-2 font-medium">Vencimento</th><th className="px-4 py-2 text-right font-medium">Valor</th></tr>
                  </thead>
                  <tbody className="divide-y divide-le-line">
                    {plan.lines.map((l) => (
                      <tr key={l.label}>
                        <td className="px-4 py-2.5 font-medium">{l.label}<span className="ml-2 text-[11px] font-normal text-le-muted">{l.kind === 'ENTRADA' ? (downMethod === 'PIX' ? 'PIX' : downMethod === 'BOLETO' ? 'boleto' : 'cliente escolhe') : 'boleto'}</span></td>
                        <td className="px-4 py-2.5"><span className="inline-flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5 text-le-muted" /> {br(l.dueDate)}</span></td>
                        <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{formatCurrency(l.amountCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-le-subtle/60 text-sm">
                    <tr><td colSpan={2} className="px-4 py-2 font-semibold">Total</td><td className="px-4 py-2 text-right font-semibold tabular-nums">{formatCurrency(plan.lines.reduce((s, l) => s + l.amountCents, 0))}</td></tr>
                  </tfoot>
                </table>
              </div>
            )}

            {summaryText && (
              <button type="button" onClick={() => navigator.clipboard.writeText(summaryText).then(() => toast('Proposta copiada — cole no WhatsApp do cliente'))} className="inline-flex items-center gap-1.5 text-xs font-medium text-le-blue hover:underline">
                <Copy className="h-3.5 w-3.5" /> Copiar proposta para enviar ao cliente
              </button>
            )}

            {error && <p role="alert" className="rounded-lg bg-le-danger-surface px-3 py-2 text-sm text-le-danger">{error}</p>}
            <button
              type="submit"
              disabled={pending || !!plan?.error || (!elig.eligible && !override)}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-le-blue text-sm font-semibold text-white hover:bg-le-blue-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Emitir {plan && !plan.error ? plan.lines.length : ''} cobranças no Asaas
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
