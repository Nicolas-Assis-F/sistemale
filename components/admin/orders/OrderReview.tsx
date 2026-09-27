import { formatCurrency, parseCurrencyToCents } from '@/lib/format';
import { OrderFormSection } from './OrderFormSection';

export function OrderReview({ customer, items, terms, method, delivery, total }: {
  customer: string;
  items: { name: string; quantity: number; priceReais: string }[];
  terms: string;
  method: string;
  delivery: string;
  total: number;
}) {
  return <OrderFormSection id="revisao">
    <h2 id="revisao-title" className="mb-4 font-heading text-lg font-medium">4. Revisão</h2>
    <dl className="grid gap-4 text-sm sm:grid-cols-2">
      <div><dt className="text-xs text-le-muted">Cliente</dt><dd>{customer || 'Informe o cliente'}</dd></div>
      <div><dt className="text-xs text-le-muted">Pagamento</dt><dd>{[terms, method].filter(Boolean).join(' · ') || 'Não informado'}</dd></div>
      <div><dt className="text-xs text-le-muted">Previsão de entrega</dt><dd>{delivery ? delivery.split('-').reverse().join('/') : 'Não informada'}</dd></div>
    </dl>
    <ul className="mt-5 divide-y divide-le-line">{items.map((item, index) => <li key={index} className="flex justify-between gap-4 py-3 text-sm"><span className="min-w-0 break-words">{item.quantity} × {item.name || 'Item sem designação'}</span><strong className="shrink-0">{formatCurrency(item.quantity * parseCurrencyToCents(item.priceReais))}</strong></li>)}</ul>
    <p className="mt-3 flex justify-between border-t border-le-line pt-3 text-sm">Total <strong>{formatCurrency(total)}</strong></p>
    <p className="mt-3 text-xs text-le-muted">Confira os dados antes de salvar. Use ⌘ Enter ou Ctrl Enter para salvar.</p>
  </OrderFormSection>;
}
