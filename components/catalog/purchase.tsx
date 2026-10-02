'use client';

// Compra na página do produto, pensada primeiro para o celular:
// - card de compra com preço, estoque, quantidade e total (ProductBuyBox);
// - folha de checkout que sobe de baixo no celular e é modal no desktop;
// - a barra fixa inferior usa o mesmo estado (usePurchase) para "Comprar";
// - sem login: vai para entrar/cadastrar e, na volta (?comprar=1), a folha reabre;
// - sem CPF/CNPJ: o documento é pedido dentro da própria folha.
import { createContext, useActionState, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import { ArrowRight, Check, ClipboardPlus, CreditCard, Loader2, Minus, PackageCheck, Plus, QrCode, ShieldCheck, Timer, Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { customerAuthClient } from '@/lib/customer-auth-client';
import { buyNow } from '@/app/(public)/conta/_actions';
import { getProductOffer } from '@/lib/catalog-offers';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

type PurchaseProduct = {
  slug: string; name: string; sku: string; priceCents: number;
  originalPriceCents?: number | null; stock: number; image?: string | null;
};

type Ctx = {
  product: PurchaseProduct;
  purchasable: boolean;
  quantity: number;
  setQuantity: (q: number) => void;
  maxQuantity: number;
  /** Abre o checkout (ou manda para o login e volta). */
  buy: () => void;
};

const PurchaseContext = createContext<Ctx | null>(null);
export const usePurchase = () => useContext(PurchaseContext);

const METHODS = [
  { value: 'PIX', label: 'PIX', hint: 'Aprovação na hora · copie o código no app do banco', icon: QrCode, badge: 'Mais rápido' },
  { value: 'CLIENTE_ESCOLHE', label: 'Cartão de crédito ou boleto', hint: 'Fatura segura do Asaas · também aceita PIX', icon: CreditCard, badge: null },
] as const;
type Method = (typeof METHODS)[number]['value'];

export function PurchaseProvider({ product, purchasable, children }: { product: PurchaseProduct; purchasable: boolean; children: React.ReactNode }) {
  const router = useRouter();
  const { data: session, isPending } = customerAuthClient.useSession();
  const maxQuantity = product.stock > 0 ? Math.min(product.stock, 99) : 99;
  const [quantity, setQty] = useState(1);
  const [open, setOpen] = useState(false);
  const setQuantity = useCallback((q: number) => setQty(Math.max(1, Math.min(maxQuantity, Math.round(q) || 1))), [maxQuantity]);

  const buy = useCallback(() => {
    if (!purchasable) return;
    if (isPending) return; // sessão ainda carregando: o clique seguinte resolve
    if (!session) {
      const back = `/vitrine/${product.slug}?comprar=1&qtd=${quantity}`;
      router.push(`/conta/entrar?next=${encodeURIComponent(back)}`);
      return;
    }
    setOpen(true);
  }, [purchasable, isPending, session, product.slug, quantity, router]);

  // Voltou do login/cadastro/confirmação de e-mail: reabre a compra de onde parou
  useEffect(() => {
    if (!purchasable || isPending || !session) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('comprar') !== '1') return;
    setQuantity(Number(params.get('qtd')) || 1);
    setOpen(true);
    params.delete('comprar');
    params.delete('qtd');
    const qs = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
  }, [purchasable, isPending, session, setQuantity]);

  const value = useMemo(() => ({ product, purchasable, quantity, setQuantity, maxQuantity, buy }), [product, purchasable, quantity, setQuantity, maxQuantity, buy]);
  return (
    <PurchaseContext.Provider value={value}>
      {children}
      {purchasable && <CheckoutSheet open={open} onOpenChange={setOpen} />}
    </PurchaseContext.Provider>
  );
}

function QuantityStepper({ value, onChange, max, size = 'md' }: { value: number; onChange: (q: number) => void; max: number; size?: 'md' | 'lg' }) {
  const h = size === 'lg' ? 'h-12' : 'h-11';
  return (
    <div className={cn('flex w-34 items-center rounded-xl border border-le-line bg-white', h)}>
      <button type="button" aria-label="Diminuir quantidade" disabled={value <= 1} onClick={() => onChange(value - 1)}
        className="flex h-full w-11 items-center justify-center text-le-text transition-opacity disabled:opacity-30">
        <Minus className="h-4 w-4" />
      </button>
      <input value={value} onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, '')))} inputMode="numeric" aria-label="Quantidade"
        className="h-full min-w-0 flex-1 bg-transparent text-center text-[15px] font-semibold tabular-nums outline-none" />
      <button type="button" aria-label="Aumentar quantidade" disabled={value >= max} onClick={() => onChange(value + 1)}
        className="flex h-full w-11 items-center justify-center text-le-text transition-opacity disabled:opacity-30">
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function Price({ product, size = 'lg' }: { product: PurchaseProduct; size?: 'lg' | 'sm' }) {
  const offer = getProductOffer(product);
  if (product.priceCents <= 0) {
    return <p className="font-heading text-2xl font-semibold tracking-[-0.04em] text-le-ink">Sob cotação</p>;
  }
  return (
    <div>
      {offer && (
        <p className="flex flex-wrap items-center gap-2 text-xs text-le-muted">
          De <del>{formatCurrency(offer.originalPriceCents)}</del>
          <span className="rounded-full bg-le-success-surface px-2 py-0.5 text-[11px] font-semibold text-le-success">−{offer.percent}%</span>
        </p>
      )}
      <p className={cn('font-heading font-semibold tracking-[-0.045em] text-le-ink tabular-nums', size === 'lg' ? 'text-[2rem] leading-tight' : 'text-lg')}>
        {formatCurrency(product.priceCents)}
      </p>
    </div>
  );
}

/** Card de compra da página do produto. */
export function ProductBuyBox({ whatsappUrl, quoteSlot }: { whatsappUrl: string; quoteSlot?: React.ReactNode }) {
  const ctx = usePurchase();
  if (!ctx) return null;
  const { product, purchasable, quantity, setQuantity, maxQuantity, buy } = ctx;
  const inStock = product.stock > 0;
  const total = product.priceCents * quantity;

  return (
    <div className="rounded-3xl border border-le-line bg-white p-5 shadow-[0_24px_60px_-40px_rgb(11_10_59/0.45)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <Price product={product} />
        <span className={cn('mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold',
          inStock ? 'bg-le-success-surface text-le-success' : 'bg-le-tint text-le-blue')}>
          {inStock ? <PackageCheck className="h-3.5 w-3.5" /> : <Timer className="h-3.5 w-3.5" />}
          {inStock ? `Pronta entrega · ${product.stock} un.` : 'Sob encomenda'}
        </span>
      </div>
      {purchasable && <p className="mt-1 text-xs text-le-muted">No PIX com aprovação na hora, ou no cartão de crédito e boleto.</p>}

      {purchasable ? (
        <>
          <div className="mt-5 flex items-center justify-between gap-3">
            <QuantityStepper value={quantity} onChange={setQuantity} max={maxQuantity} size="lg" />
            <div className="text-right">
              <p className="text-[11px] text-le-muted">Total</p>
              <p className="font-heading text-lg font-semibold tabular-nums tracking-[-0.03em]">{formatCurrency(total)}</p>
            </div>
          </div>
          <button type="button" onClick={buy}
            className="mt-4 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-le-blue text-[15px] font-semibold text-white shadow-[0_14px_30px_-14px_rgb(49_88_239/0.9)] transition-[transform,background-color] hover:bg-le-blue-hover active:scale-[0.99]">
            Comprar agora <ArrowRight className="h-4.5 w-4.5" />
          </button>
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
            className="mt-2.5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-le-whatsapp-strong/30 bg-le-whatsapp-strong/5 text-sm font-semibold text-le-whatsapp-strong transition-colors hover:bg-le-whatsapp-strong/10">
            Tirar dúvida no WhatsApp
          </a>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-le-muted">Valor e prazo conforme a configuração do seu poço. A engenharia responde rápido.</p>
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
            className="mt-5 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-le-whatsapp-strong text-[15px] font-semibold text-white">
            Pedir preço no WhatsApp <ArrowRight className="h-4.5 w-4.5" />
          </a>
        </>
      )}
      {quoteSlot && <div className="mt-2.5">{quoteSlot}</div>}

      <ul className="mt-5 grid gap-2 border-t border-le-line pt-4 text-xs text-le-muted sm:grid-cols-3 sm:gap-3">
        <li className="flex items-center gap-2"><Zap className="h-4 w-4 shrink-0 text-le-blue" /> PIX confirmado na hora</li>
        <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-le-blue" /> Pagamento seguro</li>
        <li className="flex items-center gap-2"><ClipboardPlus className="h-4 w-4 shrink-0 text-le-blue" /> Acompanhe na sua conta</li>
      </ul>
    </div>
  );
}

function SubmitBar({ total }: { total: number }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending}
      className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-le-blue text-[15px] font-semibold text-white shadow-[0_14px_30px_-14px_rgb(49_88_239/0.9)] disabled:opacity-70">
      {pending ? <><Loader2 className="h-4.5 w-4.5 animate-spin" /> Gerando pagamento…</> : <>Pagar {formatCurrency(total)} <ArrowRight className="h-4.5 w-4.5" /></>}
    </button>
  );
}

function CheckoutSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const ctx = usePurchase()!;
  const { product, quantity, setQuantity, maxQuantity } = ctx;
  const [method, setMethod] = useState<Method>('PIX');
  const [state, action] = useActionState(buyNow, undefined);
  const total = product.priceCents * quantity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          // Celular: folha que sobe de baixo, na zona do polegar
          'top-auto bottom-0 left-0 max-h-[92dvh] w-full max-w-full translate-x-0 translate-y-0 gap-0 overflow-y-auto rounded-t-3xl rounded-b-none p-0',
          'data-open:slide-in-from-bottom-8 data-open:zoom-in-100 data-closed:zoom-out-100',
          // Desktop: modal centralizado
          'sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl',
        )}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-le-line sm:hidden" aria-hidden />
        <form action={action} className="flex flex-col">
          <input type="hidden" name="slug" value={product.slug} />
          <input type="hidden" name="method" value={method} />
          <input type="hidden" name="quantity" value={quantity} />

          <div className="space-y-5 px-5 pb-4 pt-4 sm:pt-6">
            <div className="flex items-center gap-3 pr-8">
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-le-line bg-le-subtle">
                {product.image && <Image src={product.image} alt="" fill sizes="56px" className="object-contain p-1.5 mix-blend-multiply" />}
              </span>
              <div className="min-w-0">
                <DialogTitle className="truncate font-heading text-base font-semibold tracking-[-0.02em]">{product.name}</DialogTitle>
                <DialogDescription className="text-xs text-le-muted">{formatCurrency(product.priceCents)} por unidade · <span className="font-mono">{product.sku}</span></DialogDescription>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-le-text">Quantidade</span>
              <QuantityStepper value={quantity} onChange={setQuantity} max={maxQuantity} />
            </div>

            <fieldset>
              <legend className="mb-2 text-sm font-medium text-le-text">Como você quer pagar?</legend>
              <div className="space-y-2">
                {METHODS.map((m) => {
                  const active = method === m.value;
                  return (
                    <label key={m.value}
                      className={cn('flex cursor-pointer items-center gap-3 rounded-2xl border p-3.5 transition-colors', active ? 'border-le-blue bg-le-tint' : 'border-le-line bg-white')}>
                      <input type="radio" name="_method" value={m.value} checked={active} onChange={() => setMethod(m.value)} className="sr-only" />
                      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', active ? 'bg-le-blue text-white' : 'bg-le-subtle text-le-blue')}>
                        <m.icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-sm font-semibold text-le-text">
                          {m.label}
                          {m.badge && <span className="rounded-full bg-le-success-surface px-2 py-0.5 text-[10px] font-semibold text-le-success">{m.badge}</span>}
                        </span>
                        <span className="block text-xs text-le-muted">{m.hint}</span>
                      </span>
                      <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border', active ? 'border-le-blue bg-le-blue text-white' : 'border-le-line')}>
                        {active && <Check className="h-3 w-3" />}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {state?.needDoc && (
              <label className="block space-y-1.5 rounded-2xl border border-le-blue/30 bg-le-tint p-3.5">
                <span className="text-sm font-medium text-le-text">CPF ou CNPJ do pagador</span>
                <input name="doc" required autoFocus inputMode="text" autoCapitalize="characters" autoComplete="off" placeholder="000.000.000-00"
                  className="h-12 w-full rounded-xl border border-le-line bg-white px-3.5 text-[15px] outline-none focus:border-le-blue" />
                <span className="block text-xs text-le-muted">Necessário para gerar o pagamento e a nota fiscal. Fica salvo na sua conta.</span>
              </label>
            )}
            {state?.error && <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{state.error}</p>}
          </div>

          <div className="sticky bottom-0 space-y-2 border-t border-le-line bg-white/95 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 supports-backdrop-filter:backdrop-blur">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-le-muted">Total</span>
              <span className="font-heading text-xl font-semibold tabular-nums tracking-[-0.03em]">{formatCurrency(total)}</span>
            </div>
            <SubmitBar total={total} />
            <p className="text-center text-[11px] text-le-muted">A confirmação aparece sozinha na tela depois de pagar.</p>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
