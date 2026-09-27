'use client';

import { useState, useTransition } from 'react';
import { Copy, ExternalLink, Link2, Loader2, Send } from 'lucide-react';
import { createPublicLink } from '@/app/admin/pedidos/_payment-actions';
import { toast } from '../toast';

/** Link público do pedido: o cliente acompanha status e paga sem login. */
export function CustomerLinkCard({ orderId, orderNumber, token, siteUrl, customerPhone }: {
  orderId: string; orderNumber: string; token: string | null; siteUrl: string; customerPhone: string | null;
}) {
  const [current, setCurrent] = useState(token);
  const [pending, start] = useTransition();
  const url = current ? `${siteUrl}/pedido/${current}` : null;
  const phone = customerPhone?.replace(/\D/g, '');
  const wa = url && phone
    ? `https://wa.me/${phone.startsWith('55') ? phone : `55${phone}`}?text=${encodeURIComponent(`Olá Acompanhe seu pedido ${orderNumber} da L&E Torneadora e faça o pagamento por aqui: ${url}`)}`
    : null;

  return (
    <section className="rounded-2xl border border-le-line bg-white px-5 py-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold"><Link2 className="h-4 w-4 text-le-blue" /> Link do cliente</h2>
      <p className="mt-1 text-[11px] leading-5 text-le-muted">Página sem login com status, itens e botões de pagamento.</p>
      {url ? (
        <>
          <p className="mt-3 truncate rounded-lg bg-le-subtle px-3 py-2 font-mono text-[11px] text-le-muted">{url}</p>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            <button onClick={() => navigator.clipboard.writeText(url).then(() => toast('Link copiado'))} className="flex h-8 items-center justify-center gap-1 rounded-lg border border-le-line text-[11px] font-medium hover:border-le-blue-border hover:text-le-blue">
              <Copy className="h-3 w-3" /> Copiar
            </button>
            <a href={url} target="_blank" rel="noopener noreferrer" className="flex h-8 items-center justify-center gap-1 rounded-lg border border-le-line text-[11px] font-medium hover:border-le-blue-border hover:text-le-blue">
              <ExternalLink className="h-3 w-3" /> Abrir
            </a>
            <a
              href={wa ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!wa}
              title={wa ? undefined : 'Cliente sem telefone no cadastro'}
              className="flex h-8 items-center justify-center gap-1 rounded-lg bg-le-whatsapp-strong text-[11px] font-semibold text-white aria-disabled:pointer-events-none aria-disabled:opacity-40"
            >
              <Send className="h-3 w-3" /> WhatsApp
            </a>
          </div>
        </>
      ) : (
        <button
          onClick={() => start(async () => {
            const res = await createPublicLink(orderId);
            if ('error' in res) return toast(res.error, 'error');
            setCurrent(res.token);
            toast('Link criado');
          })}
          disabled={pending}
          className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-le-line text-xs font-medium text-le-muted hover:border-le-blue hover:text-le-blue"
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />} Gerar link de acompanhamento
        </button>
      )}
    </section>
  );
}
