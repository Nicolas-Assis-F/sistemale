import { buttonVariants } from "@/components/ui/button";
import { ArrowUpRight, Check, FileText, QrCode } from 'lucide-react';
import type { OrderStatus, Prisma } from '@prisma/client';
import { formatCurrency } from '@/lib/format';
import { ORDER_STATUS_LABELS } from '@/lib/order-status';
import { ORDER_PAYMENT_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from '@/lib/finance-labels';
import { buildWhatsAppUrl } from '@/lib/whatsapp-url';
import { CopyButton } from '@/components/public/CopyButton';
import { WhatsAppIcon } from '@/components/catalog/icons';


const FLOW: OrderStatus[] = ['ORCAMENTO', 'PEDIDO', 'EM_FABRICACAO', 'CONCLUIDO', 'ENTREGUE'];
const fmt = (d: Date | null) => (d ? d.toLocaleDateString('pt-BR') : '—');

/** Campos seguros para o cliente: nada de documento, endereço ou notas internas. */
export const ORDER_VIEW_SELECT = {
  number: true, status: true, paymentStatus: true, totalCents: true, paidCents: true, deliveryDate: true, createdAt: true,
  customer: { select: { name: true } },
  items: { orderBy: { position: 'asc' }, select: { id: true, name: true, description: true, quantity: true, unitPriceCents: true } },
  payments: {
    where: { status: { not: 'CANCELADO' } },
    orderBy: { dueDate: 'asc' },
    select: { id: true, method: true, status: true, amountCents: true, dueDate: true, paidAt: true, invoiceUrl: true, bankSlipUrl: true, pixPayload: true, pixQrImage: true, planLabel: true, finePercent: true, interestPercent: true },
  },
} satisfies Prisma.OrderSelect;

export type OrderViewData = Prisma.OrderGetPayload<{ select: typeof ORDER_VIEW_SELECT }>;

/** Visualização do pedido para o cliente (link público e área "Minha conta"). */
export function OrderView({ order, backLink }: { order: OrderViewData; backLink?: React.ReactNode }) {
  const idx = FLOW.indexOf(order.status);
  const open = order.payments.filter((p) => p.status === 'PENDENTE' || p.status === 'VENCIDO');
  const balance = Math.max(0, order.totalCents - order.paidCents);

  return (
    <div className="le-public-order le-container max-w-4xl py-10 lg:py-16">
      {backLink}
      <p className="le-kicker">Acompanhamento de pedido</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="le-section-title">Pedido {order.number}</h1>
          <p className="mt-2 text-sm text-le-muted">Olá, {order.customer.name.split(' ')[0]}. Aqui você acompanha seu pedido com a L&E Torneadora.</p>
        </div>
        <span className="rounded-full bg-le-tint px-3 py-1.5 text-xs font-semibold text-le-blue">{ORDER_PAYMENT_LABELS[order.paymentStatus]}</span>
      </div>

      {order.paymentStatus === 'PAGO' && <section aria-label="Pedido pago" className="mt-6 flex items-center gap-4 rounded-2xl border border-le-success/30 bg-le-success/5 p-5">
        <Check aria-hidden className="size-8 shrink-0 text-le-success" /><div><h2 className="font-heading text-xl font-medium text-le-success">Pago ✓</h2><p className="mt-1 text-sm text-le-muted">Pagamento confirmado. Obrigado pela confiança na L&E.</p></div>
      </section>}
      {/* Pagamento */}
      {open.length > 0 && (
        <section className="mt-6 space-y-3">
          <h2 className="font-heading text-lg font-medium">Pagamento</h2>
          {open.map((p) => {
            const invoiceFirst = p.method !== 'PIX' && Boolean(p.invoiceUrl);
            return (
            <div key={p.id} className="rounded-3xl border border-le-line bg-white p-5 shadow-[0_24px_60px_-44px_rgb(11_10_59/0.45)] sm:p-6">
              {p.planLabel && <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-le-blue">{p.planLabel}</p>}
              <div className="flex flex-wrap items-end justify-between gap-2">
                <p className="font-heading text-[2rem] font-semibold leading-tight tabular-nums tracking-[-0.045em]">{formatCurrency(p.amountCents)}</p>
                <p className={`text-xs ${p.status === 'VENCIDO' ? 'font-semibold text-red-600' : 'text-le-muted'}`}>
                  {PAYMENT_METHOD_LABELS[p.method]} · {p.status === 'VENCIDO' ? 'venceu' : 'pague até'} {fmt(p.dueDate)}
                </p>
              </div>
              {p.finePercent ? <p className="mt-1 text-[11px] text-le-muted">Após o vencimento: multa {p.finePercent}% + juros {p.interestPercent}% ao mês</p> : null}

              <div className="mt-5 space-y-2.5 print:hidden">
                {invoiceFirst && (
                  <a href={p.invoiceUrl!} target="_blank" rel="noopener noreferrer"
                    className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-le-blue text-[15px] font-semibold text-white shadow-[0_14px_30px_-14px_rgb(49_88_239/0.9)]">
                    Pagar com cartão ou boleto <ArrowUpRight size={17} />
                  </a>
                )}
                {p.pixPayload && (
                  <CopyButton value={p.pixPayload} label={invoiceFirst ? 'Ou copie o código PIX' : 'Copiar código PIX'} doneLabel="Código copiado! Cole no app do banco"
                    className={invoiceFirst
                      ? 'flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-le-line bg-white text-sm font-semibold text-le-text'
                      : 'flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-le-blue text-[15px] font-semibold text-white shadow-[0_14px_30px_-14px_rgb(49_88_239/0.9)]'} />
                )}
                {!p.pixPayload && !invoiceFirst && p.invoiceUrl && (
                  <a href={p.invoiceUrl} target="_blank" rel="noopener noreferrer"
                    className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-le-blue text-[15px] font-semibold text-white">
                    Pagar agora <ArrowUpRight size={17} />
                  </a>
                )}
                {p.bankSlipUrl && (
                  <a href={p.bankSlipUrl} target="_blank" rel="noopener noreferrer"
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-le-line bg-white text-sm font-semibold text-le-text">
                    <FileText className="h-4 w-4" /> Baixar boleto
                  </a>
                )}
              </div>

              {p.pixPayload && (
                <>
                  <ol className="mt-4 space-y-1.5 text-xs text-le-muted">
                    <li><span className="font-semibold text-le-text">1.</span> Toque em copiar o código PIX</li>
                    <li><span className="font-semibold text-le-text">2.</span> No app do seu banco, abra <span className="font-semibold text-le-text">Pix → Pix Copia e Cola</span></li>
                    <li><span className="font-semibold text-le-text">3.</span> Confirme o pagamento. A confirmação aparece aqui sozinha.</li>
                  </ol>
                  {p.pixQrImage && (
                    <>
                      {/* Celular: QR só se for pagar por outro aparelho */}
                      <details className="mt-4 rounded-2xl border border-le-line p-3 sm:hidden">
                        <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-le-text">
                          <QrCode className="h-4 w-4 text-le-blue" /> Mostrar QR Code (pagar com outro aparelho)
                        </summary>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`data:image/png;base64,${p.pixQrImage}`} alt="QR Code PIX" className="mx-auto mt-3 h-52 w-52 rounded-xl bg-white" />
                      </details>
                      <div className="mt-4 hidden items-center gap-4 rounded-2xl border border-le-line p-4 sm:flex">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`data:image/png;base64,${p.pixQrImage}`} alt="QR Code PIX" className="h-36 w-36 shrink-0 rounded-xl bg-white" />
                        <p className="text-xs text-le-muted">Ou aponte a câmera do app do banco para o QR Code.</p>
                      </div>
                    </>
                  )}
                  {!invoiceFirst && p.invoiceUrl && (
                    <a href={p.invoiceUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-le-muted underline-offset-2 hover:underline print:hidden">
                      Abrir fatura do Asaas <ArrowUpRight size={12} />
                    </a>
                  )}
                </>
              )}
            </div>
            );
          })}
        </section>
      )}

      {/* Status */}
      <div className="mt-8 rounded-3xl border border-le-line bg-white p-5 sm:p-7">
        {order.status === 'CANCELADO' ? (
          <p className="text-sm font-medium text-red-600">Este pedido foi cancelado. Fale com a nossa equipe se tiver dúvidas.</p>
        ) : (
          <ol className="grid gap-4 sm:grid-cols-5 sm:gap-2">
            {FLOW.map((s, i) => {
              const done = i < idx;
              const active = i === idx;
              return (
                <li key={s} aria-current={active ? "step" : undefined} className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-2">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${active ? 'bg-le-ink text-le-yellow' : done ? 'bg-emerald-500 text-white' : 'bg-le-subtle text-le-muted'}`}>
                    {done ? <Check className="h-4 w-4" /> : i + 1}
                  </span>
                  <span className={`text-xs font-medium ${active ? 'text-le-ink' : done ? 'text-le-text' : 'text-le-muted'}`}>{ORDER_STATUS_LABELS[s]}</span>
                </li>
              );
            })}
          </ol>
        )}
        <p className="mt-5 border-t border-le-line pt-4 text-xs text-le-muted">
          Pedido em {fmt(order.createdAt)}{order.deliveryDate ? ` · previsão de entrega ${fmt(order.deliveryDate)}` : ''}
        </p>
      </div>

      {/* Itens */}
      <section className="mt-6 overflow-hidden rounded-3xl border border-le-line bg-white">
        <ul className="divide-y divide-le-line">
          {order.items.map((it) => (
            <li key={it.id} className="flex items-start justify-between gap-4 px-5 py-4 sm:px-7">
              <div className="min-w-0">
                <p className="font-medium text-le-text">{it.name}</p>
                {it.description && <p className="text-xs text-le-muted">{it.description}</p>}
                <p className="mt-0.5 text-xs text-le-muted">{it.quantity} × {it.unitPriceCents > 0 ? formatCurrency(it.unitPriceCents) : 'valor em cotação'}</p>
              </div>
              <p className="shrink-0 text-sm font-semibold">{it.unitPriceCents > 0 ? formatCurrency(it.quantity * it.unitPriceCents) : <span className="rounded-full bg-le-tint px-2 py-0.5 text-[11px] text-le-blue">Em cotação</span>}</p>
            </li>
          ))}
        </ul>
        <dl className="space-y-1.5 border-t border-le-line bg-le-subtle px-5 py-4 text-sm sm:px-7">
          <div className="flex justify-between"><dt className="text-le-muted">Total</dt><dd className="font-semibold">{order.totalCents > 0 ? formatCurrency(order.totalCents) : 'Aguardando orçamento da engenharia'}</dd></div>
          {order.paidCents > 0 && <div className="flex justify-between"><dt className="text-le-muted">Pago</dt><dd className="font-semibold text-le-success">{formatCurrency(order.paidCents)}</dd></div>}
          {balance > 0 && <div className="flex justify-between"><dt className="text-le-muted">Saldo</dt><dd className="font-semibold">{formatCurrency(balance)}</dd></div>}
        </dl>
      </section>

      {order.payments.some((p) => p.paidAt) && (
        <section className="mt-6">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-le-muted">Pagamentos recebidos</h2>
          <ul className="space-y-2">
            {order.payments.filter((p) => p.paidAt).map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-2xl border border-le-line bg-white px-5 py-3 text-sm">
                <span>{formatCurrency(p.amountCents)} · {PAYMENT_METHOD_LABELS[p.method]}</span>
                <span className="text-xs text-le-muted">{PAYMENT_STATUS_LABELS[p.status]} em {fmt(p.paidAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <a
        href={buildWhatsAppUrl().replace(/text=[^&]*/, `text=${encodeURIComponent(`Olá Tenho uma dúvida sobre o pedido ${order.number}.`)}`)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-le-whatsapp-strong hover:underline"
      >
        <WhatsAppIcon className="h-4 w-4" /> Falar com a L&E sobre este pedido
      </a>
    </div>
  );
}
