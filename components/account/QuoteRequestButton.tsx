'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useFormStatus } from 'react-dom';
import { ClipboardPlus, Loader2, Minus, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { customerAuthClient } from '@/lib/customer-auth-client';
import { requestQuote } from '@/app/(public)/conta/_actions';
import { cn } from '@/lib/utils';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-le-blue text-sm font-semibold text-white hover:bg-le-blue-hover disabled:opacity-70">
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardPlus className="h-4 w-4" />} Enviar solicitação
    </button>
  );
}

/**
 * Orçamento formal pelo site: cria o pedido na conta do cliente (acompanhamento,
 * cobrança e pagamento pelo portal). Sem sessão, leva ao login e volta.
 */
export function QuoteRequestButton({ slug, name, className }: { slug: string; name: string; className?: string }) {
  const { data } = customerAuthClient.useSession();
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const cls = cn('flex h-12 w-full items-center justify-center gap-2 rounded-[10px] border border-le-ink bg-le-ink text-xs font-semibold text-white transition-colors hover:bg-le-ink-deep', className);

  if (!data) {
    return (
      <Link href={`/conta/entrar?next=${encodeURIComponent(`/vitrine/${slug}`)}`} className={cls}>
        <ClipboardPlus size={16} /> Solicitar orçamento formal
      </Link>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cls}>
        <ClipboardPlus size={16} /> Solicitar orçamento formal
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Solicitar orçamento</DialogTitle>
            <DialogDescription>{name} — a engenharia responde com valores e prazo. Você acompanha tudo em “Minha conta”.</DialogDescription>
          </DialogHeader>
          <form action={requestQuote} className="space-y-4">
            <input type="hidden" name="slug" value={slug} />
            <div>
              <span className="text-xs font-medium text-le-text">Quantidade</span>
              <div className="mt-1.5 flex h-11 w-36 items-center rounded-xl border border-le-line">
                <button type="button" aria-label="Diminuir" onClick={() => setQty((q) => Math.max(1, q - 1))} className="flex h-full w-10 items-center justify-center text-le-muted hover:text-le-text"><Minus className="h-4 w-4" /></button>
                <input name="quantity" value={qty} onChange={(e) => setQty(Math.max(1, Math.min(999, Number(e.target.value) || 1)))} inputMode="numeric" aria-label="Quantidade" className="h-full min-w-0 flex-1 bg-transparent text-center text-sm font-semibold outline-none" />
                <button type="button" aria-label="Aumentar" onClick={() => setQty((q) => Math.min(999, q + 1))} className="flex h-full w-10 items-center justify-center text-le-muted hover:text-le-text"><Plus className="h-4 w-4" /></button>
              </div>
            </div>
            <label className="block">
              <span className="text-xs font-medium text-le-text">Observações (opcional)</span>
              <textarea name="notes" rows={3} maxLength={1000} placeholder="Profundidade do poço, tipo de solo, prazo desejado…" className="mt-1.5 w-full rounded-xl border border-le-line p-3 text-sm outline-none focus:border-le-blue focus:shadow-[0_0_0_4px_rgb(49_88_239/0.12)]" />
            </label>
            <SubmitButton />
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
