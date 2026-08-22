'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { formatCurrency } from '@/lib/format';
import { WhatsAppButton } from './WhatsAppButton';

interface Props {
  sku: string;
  productName: string;
  priceCents: number;
}

/**
 * Barra fixa de compra para mobile: um sentinel invisível é renderizado no
 * lugar onde este componente é montado (logo após o CTA principal); quando
 * ele sai da viewport ao rolar, a barra fixa aparece no rodapé com o mesmo
 * WhatsAppButton (mesma mensagem, só reestilizado para caber na barra).
 */
export function StickyBuyBar({ sku, productName, priceCents }: Props) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting), {
      threshold: 0,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} aria-hidden className="h-px" />
      <AnimatePresence>
        {visible && (
          <m.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed inset-x-0 bottom-0 z-45 border-t border-border bg-background/95 p-3 shadow-raised supports-backdrop-filter:backdrop-blur-md lg:hidden"
          >
            <div className="container mx-auto flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</p>
                <p className="text-lg font-bold text-primary">{formatCurrency(priceCents)}</p>
              </div>
              <WhatsAppButton sku={sku} productName={productName} className="max-w-56 flex-1">
                Tenho interesse
              </WhatsAppButton>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}
