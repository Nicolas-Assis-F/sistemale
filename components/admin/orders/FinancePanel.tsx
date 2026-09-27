'use client';

import { Button } from '@/components/ui/button';

import { useState, useTransition, type FormEvent } from 'react';
import type { OrderPaymentStatus, PaymentMethod, PaymentProvider, PaymentStatus } from '@prisma/client';
import {
  Ban, Check, Copy, CreditCard, ExternalLink, FileText, Loader2, Plus, QrCode, RefreshCw, Undo2, Wallet,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { centsToCurrencyInput, formatCurrency } from '@/lib/format';
import {
  ASAAS_METHODS, MANUAL_METHODS, ORDER_PAYMENT_BADGE, ORDER_PAYMENT_LABELS, PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_BADGE, PAYMENT_STATUS_LABELS,
} from '@/lib/finance-labels';
import {
  cancelPayment, createAsaasCharge, registerManualPayment, syncAsaasPayment, voidManualPayment,
} from '@/app/admin/pedidos/_payment-actions';
import { cn } from '@/lib/utils';
import { toast } from '../toast';
import { PaymentPlanDialog } from './PaymentPlanDialog';

export interface PaymentRow {
  id: string;
  provider: PaymentProvider;
  method: PaymentMethod;
  status: PaymentStatus;
  amountCents: number;
  netCents: number | null;
  dueDate: string | null;
  paidAt: string | null;
  invoiceUrl: string | null;
  bankSlipUrl: string | null;
  pixPayload: string | null;
  pixQrImage: string | null;
  installmentCount: number | null;
  planLabel?: string | null;
  finePercent?: number | null;
  interestPercent?: number | null;
  createdAt: string;
}

interface Props {
  orderId: string;
  orderCancelled: boolean;
  totalCents: number;
  paidCents: number;
  paymentStatus: OrderPaymentStatus;
  payments: PaymentRow[];
  asaas: { enabled: boolean; env: 'sandbox' | 'production' };
  customerDocOk: boolean;
}

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—');
const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const inputCls = 'h-10 w-full rounded-xl border border-le-line bg-white px-3 text-sm outline-none focus:border-le-blue focus:shadow-[0_0_0_4px_rgb(49_88_239/0.12)]';

type Result = { ok: true; message?: string } | { error: string };

export function FinancePanel({ orderId, orderCancelled, totalCents, paidCents, paymentStatus, payments, asaas, customerDocOk }: Props) {
  const [dialog, setDialog] = useState<'asaas' | 'manual' | 'plan' | null>(null);
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const balance = Math.max(0, totalCents - paidCents);
  const progress = totalCents > 0 ? Math.min(100, (paidCents / totalCents) * 100) : 0;
  const open = payments.filter((p) => p.status === 'PENDENTE' || p.status === 'VENCIDO');
  const openCents = open.reduce((s, p) => s + p.amountCents, 0);

  function run(id: string, fn: () => Promise<Result>, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusyId(id);
    start(async () => {
      const res = await fn();
      setBusyId(null);
      toast('error' in res ? res.error : (res.message ?? 'Feito'), 'error' in res ? 'error' : 'success');
    });
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-le-line bg-white">
      <header className="flex items-center justify-between gap-3 border-b border-le-line px-5 py-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold"><Wallet className="h-4 w-4 text-le-blue" /> Financeiro</h2>
        <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold', ORDER_PAYMENT_BADGE[paymentStatus])}>{ORDER_PAYMENT_LABELS[paymentStatus]}</span>
      </header>

      <div className="px-5 py-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-le-muted">Recebido</p>
            <p className="font-heading text-2xl font-semibold tracking-tight">{formatCurrency(paidCents)}</p>
          </div>
          <p className="text-right text-xs text-le-muted">de {formatCurrency(totalCents)}</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-le-subtle">
          <div className="h-full rounded-full bg-linear-to-r from-le-blue to-emerald-500 origin-left transition-transform duration-300" style={{ transform: `scaleX(${progress / 100})` }} />
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-le-subtle px-3 py-2">
            <dt className="text-le-muted">Saldo a receber</dt>
            <dd className="mt-0.5 font-semibold">{formatCurrency(balance)}</dd>
          </div>
          <div className="rounded-xl bg-le-subtle px-3 py-2">
            <dt className="text-le-muted">Em cobrança</dt>
            <dd className="mt-0.5 font-semibold">{formatCurrency(openCents)}</dd>
          </div>
        </dl>
        {totalCents === 0 && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Pedido sem valor: preencha os preços dos itens antes de cobrar.</p>
        )}

        {!orderCancelled && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => setDialog('asaas')}
              disabled={!asaas.enabled || balance <= 0}
              title={!asaas.enabled ? 'Configure ASAAS_API_KEY para ativar' : undefined}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-le-blue text-xs font-semibold text-white transition-colors hover:bg-le-blue-hover disabled:cursor-not-allowed disabled:opacity-45"
            >
              <CreditCard className="h-3.5 w-3.5" /> Cobrar via Asaas
            </button>
            <button
              onClick={() => setDialog('manual')}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-le-line text-xs font-semibold text-le-text transition-colors hover:border-le-blue-border hover:text-le-blue"
            >
              <Plus className="h-3.5 w-3.5" /> Lançar recebimento
            </button>
            <button
              onClick={() => setDialog('plan')}
              disabled={!asaas.enabled || balance - openCents <= 0}
              title={balance - openCents <= 0 ? 'Sem saldo livre: cancele as cobranças em aberto para renegociar' : undefined}
              className="col-span-2 flex h-10 items-center justify-center gap-1.5 rounded-xl border border-dashed border-le-blue-border text-xs font-semibold text-le-blue transition-colors hover:bg-le-tint disabled:cursor-not-allowed disabled:opacity-45"
            >
              <CreditCard className="h-3.5 w-3.5" /> Parcelar com entrada (boletos)
            </button>
          </div>
        )}
        {!asaas.enabled && (
          <p className="mt-2 text-[11px] text-le-muted">Asaas desligado — lançamentos manuais continuam disponíveis.</p>
        )}
        {asaas.enabled && asaas.env === 'sandbox' && (
          <p className="mt-2 text-[11px] font-medium text-amber-700">Asaas em modo SANDBOX (testes).</p>
        )}
      </div>

      {/* Cobranças */}
      <ul className="divide-y divide-le-line border-t border-le-line">
        {payments.length === 0 && <li className="px-5 py-6 text-center text-xs text-le-muted">Nenhuma cobrança ou recebimento ainda.</li>}
        {payments.map((p) => (
          <li key={p.id} className={cn('px-5 py-3.5', p.status === 'CANCELADO' && 'opacity-55')}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{p.planLabel && <span className="mr-1.5 rounded-md bg-le-tint px-1.5 py-0.5 text-[11px] font-semibold text-le-blue">{p.planLabel}</span>}{formatCurrency(p.amountCents)}</p>
                <p className="mt-0.5 text-[11px] text-le-muted">
                  {PAYMENT_METHOD_LABELS[p.method]} · {p.provider === 'ASAAS' ? 'Asaas' : 'Manual'}
                  {p.installmentCount ? ` · parcelado ${p.installmentCount}x` : ''}
                  {p.finePercent ? ` · multa ${p.finePercent}% + juros ${p.interestPercent}% a.m.` : ''}
                </p>
                <p className="text-[11px] text-le-muted">
                  {p.paidAt ? `Pago em ${fmtDate(p.paidAt)}` : `Vence ${fmtDate(p.dueDate)}`}
                  {p.netCents !== null && p.provider === 'ASAAS' && p.paidAt ? ` · líquido ${formatCurrency(p.netCents)}` : ''}
                </p>
              </div>
              <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold', PAYMENT_STATUS_BADGE[p.status])}>{PAYMENT_STATUS_LABELS[p.status]}</span>
            </div>

            {p.status !== 'CANCELADO' && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {p.invoiceUrl && <LinkChip href={p.invoiceUrl} icon={ExternalLink}>Fatura</LinkChip>}
                {p.bankSlipUrl && <LinkChip href={p.bankSlipUrl} icon={FileText}>Boleto</LinkChip>}
                {p.pixPayload && (
                  <Chip
                    icon={Copy}
                    onClick={() => navigator.clipboard.writeText(p.pixPayload!).then(() => toast('PIX copia e cola copiado'))}
                  >
                    PIX copia e cola
                  </Chip>
                )}
                {p.pixQrImage && <PixQr image={p.pixQrImage} />}
                {p.provider === 'ASAAS' && (
                  <Chip icon={busyId === p.id && pending ? Loader2 : RefreshCw} spin={busyId === p.id && pending} onClick={() => run(p.id, () => syncAsaasPayment(p.id))}>
                    Atualizar
                  </Chip>
                )}
                {(p.status === 'PENDENTE' || p.status === 'VENCIDO') && (
                  <Chip icon={Ban} danger onClick={() => run(p.id, () => cancelPayment(p.id), 'Cancelar esta cobrança? No Asaas ela também será removida.')}>
                    Cancelar
                  </Chip>
                )}
                {p.provider === 'MANUAL' && p.status === 'RECEBIDO' && (
                  <Chip icon={Undo2} danger onClick={() => run(p.id, () => voidManualPayment(p.id), 'Desfazer este lançamento manual?')}>
                    Desfazer
                  </Chip>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      <Dialog open={dialog === 'asaas'} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova cobrança Asaas</DialogTitle>
            <DialogDescription>O cliente recebe o link da fatura; o pagamento é confirmado automaticamente pelo webhook.</DialogDescription>
          </DialogHeader>
          {!customerDocOk ? (
            <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">O cliente precisa de CPF/CNPJ válido no cadastro para gerar cobrança no Asaas.</p>
          ) : (
            <ChargeForm
              submitLabel="Gerar cobrança"
              methods={ASAAS_METHODS}
              defaultAmount={balance}
              withInstallments
              onSubmit={(fd) => createAsaasCharge(orderId, fd)}
              onDone={() => setDialog(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === 'manual'} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Lançar recebimento</DialogTitle>
            <DialogDescription>Para valores recebidos fora do Asaas (PIX direto, TED, dinheiro, promissória).</DialogDescription>
          </DialogHeader>
          <ChargeForm
            submitLabel="Registrar recebimento"
            methods={MANUAL_METHODS}
            defaultAmount={balance}
            dateField="paidAt"
            onSubmit={(fd) => registerManualPayment(orderId, fd)}
            onDone={() => setDialog(null)}
          />
        </DialogContent>
      </Dialog>
      <PaymentPlanDialog orderId={orderId} open={dialog === 'plan'} onOpenChange={(o) => setDialog(o ? 'plan' : null)} />
    </section>
  );
}

function ChargeForm({
  methods, defaultAmount, submitLabel, withInstallments, dateField = 'dueDate', onSubmit, onDone,
}: {
  methods: PaymentMethod[];
  defaultAmount: number;
  submitLabel: string;
  withInstallments?: boolean;
  dateField?: 'dueDate' | 'paidAt';
  onSubmit: (fd: FormData) => Promise<Result>;
  onDone: () => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const [method, setMethod] = useState<PaymentMethod>(methods[0]);
  const defaultDate = dateField === 'dueDate' ? isoDate(new Date(Date.now() + 3 * 86_400_000)) : isoDate(new Date());

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError('');
    start(async () => {
      const res = await onSubmit(fd);
      if ('error' in res) return setError(res.error);
      toast(res.message ?? 'Feito');
      onDone();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block text-xs font-medium text-le-text">
        Forma de pagamento
        <select name="method" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className={cn(inputCls, 'mt-1.5')}>
          {methods.map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs font-medium text-le-text">
          Valor (R$)
          <input name="amount" defaultValue={centsToCurrencyInput(defaultAmount)} inputMode="decimal" required className={cn(inputCls, 'mt-1.5')} />
        </label>
        <label className="block text-xs font-medium text-le-text">
          {dateField === 'dueDate' ? 'Vencimento' : 'Data do recebimento'}
          <input name={dateField} type="date" defaultValue={defaultDate} required className={cn(inputCls, 'mt-1.5')} />
        </label>
      </div>
      {withInstallments && (method === 'CARTAO' || method === 'BOLETO') && (
        <label className="block text-xs font-medium text-le-text">
          Parcelas
          <select name="installments" defaultValue="1" className={cn(inputCls, 'mt-1.5')}>
            {Array.from({ length: method === 'CARTAO' ? 12 : 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n === 1 ? 'À vista' : `${n}x`}</option>
            ))}
          </select>
        </label>
      )}
      <label className="block text-xs font-medium text-le-text">
        Descrição (opcional)
        <input name="description" maxLength={300} placeholder="Ex.: Entrada 50% — Perfuratriz AR-100" className={cn(inputCls, 'mt-1.5')} />
      </label>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      <Button type="submit" loading={pending} className="w-full">
        {!pending && <Check className="h-4 w-4" />} {submitLabel}
      </Button>
    </form>
  );
}

function Chip({ icon: Icon, children, onClick, danger, spin }: { icon: typeof Copy; children: React.ReactNode; onClick: () => void; danger?: boolean; spin?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-medium transition-colors',
        danger ? 'border-transparent text-le-danger hover:bg-red-50' : 'border-le-line text-le-text hover:border-le-blue-border hover:text-le-blue',
      )}
    >
      <Icon className={cn('h-3 w-3', spin && 'animate-spin')} /> {children}
    </button>
  );
}

function LinkChip({ href, icon: Icon, children }: { href: string; icon: typeof Copy; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-le-line px-2.5 text-[11px] font-medium text-le-text transition-colors hover:border-le-blue-border hover:text-le-blue">
      <Icon className="h-3 w-3" /> {children}
    </a>
  );
}

function PixQr({ image }: { image: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Chip icon={QrCode} onClick={() => setOpen(true)}>QR Code</Chip>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogTitle>QR Code PIX</DialogTitle>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`data:image/png;base64,${image}`} alt="QR Code PIX" className="mx-auto w-full max-w-60 rounded-xl" />
        </DialogContent>
      </Dialog>
    </>
  );
}
