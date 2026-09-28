'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { useFormStatus } from 'react-dom';
import { CreditCard, Loader2, Minus, Plus, QrCode, ShoppingBag } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { customerAuthClient } from '@/lib/customer-auth-client';
import { buyNow } from '@/app/(public)/conta/_actions';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

const METHODS = [
  { value: 'PIX', label: 'PIX', hint: 'QR Code na tela · confirmação em segundos', icon: QrCode },
  { value: 'CLIENTE_ESCOLHE', label: 'Cartão ou boleto', hint: 'Fatura segura do Asaas · cartão de crédito, boleto ou PIX', icon: CreditCard },
] as const;

function Submit({ totalCents }: { totalCents: number }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-le-blue text-sm font-semibold text-white hover:bg-le-blue-hover disabled:opacity-70">
      {pending ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando pagamento…</> : <>Ir para o pagamento · {formatCurrency(totalCents)}</>}
    </button>
  );
}

/**
 * Compra direta. O total mostrado aqui é só informativo: o servidor recalcula
 * pelo preço do banco. Sem sessão, leva ao login e volta para o produto.
 */
export function BuyButton({ slug, name, priceCents, stock, className }: { slug: string; name: string; priceCents: number; stock: number; className?: string }) {
  const { data } = customerAuthClient.useSession();
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const [method, setMethod] = useState<(typeof METHODS)[number]['value']>('PIX');
  const [state, action] = useActionState(buyNow, undefined);
  const max = stock > 0 ? Math.min(stock, 99) : 99;
  const cls = cn('flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-le-blue text-sm font-semibold text-white transition-colors hover:bg-le-blue-hover', className);

  if (!data) {
    return (
      <Link href={`/conta/entrar?next=${encodeURIComponent(`/vitrine/${slug}`)}`} className={cls}>
        <ShoppingBag size={17} /> Comprar agora
      </Link>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cls}>
        <ShoppingBag size={17} /> Comprar agora
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Finalizar compra</DialogTitle>
            <DialogDescription>{name}</DialogDescription>
          </DialogHeader>
          <form action={action} className="space-y-5">
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="method" value={method} />
            <div className="flex items-end justify-between gap-4">
              <div>
                <span className="text-xs font-medium text-le-text">Quantidade</span>
                <div className="mt-1.5 flex h-11 w-36 items-center rounded-xl border border-le-line">
                  <button type="button" aria-label="Diminuir" onClick={() => setQty((q) => Math.max(1, q - 1))} className="flex h-full w-10 items-center justify-center text-le-muted hover:text-le-text"><Minus className="h-4 w-4" /></button>
                  <input name="quantity" value={qty} onChange={(e) => setQty(Math.max(1, Math.min(max, Number(e.target.value) || 1)))} inputMode="numeric" aria-label="Quantidade" className="h-full min-w-0 flex-1 bg-transparent text-center text-sm font-semibold outline-none" />
                  <button type="button" aria-label="Aumentar" onClick={() => setQty((q) => Math.min(max, q + 1))} className="flex h-full w-10 items-center justify-center text-le-muted hover:text-le-text"><Plus className="h-4 w-4" /></button>
                </div>
                {stock > 0 && <p className="mt-1 text-[11px] text-le-muted">{stock} em estoque</p>}
              </div>
              <div className="text-right">
                <p className="text-xs text-le-muted">Total</p>
                <p className="font-heading text-2xl font-semibold tracking-tight">{formatCurrency(priceCents * qty)}</p>
              </div>
            </div>
            <fieldset className="space-y-2">
              <legend className="mb-2 text-xs font-medium text-le-text">Forma de pagamento</legend>
              {METHODS.map((m) => (
                <label key={m.value} className={cn('flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors', method === m.value ? 'border-le-blue bg-le-tint' : 'border-le-line hover:border-le-blue/40')}>
                  <input type="radio" name="_method" value={m.value} checked={method === m.value} onChange={() => setMethod(m.value)} className="mt-1 accent-le-blue" />
                  <m.icon className="mt-0.5 h-4.5 w-4.5 shrink-0 text-le-blue" />
                  <span>
                    <span className="block text-sm font-semibold text-le-text">{m.label}</span>
                    <span className="block text-xs text-le-muted">{m.hint}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            {state?.error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
            <Submit totalCents={priceCents * qty} />
            <p className="text-center text-[11px] text-le-muted">O pedido é confirmado automaticamente quando o pagamento for aprovado.</p>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
