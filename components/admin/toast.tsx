'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { CheckCircle2, CircleAlert } from 'lucide-react';

type ToastItem = { id: number; message: string; tone: 'success' | 'error' };
const EVENT = 'le-admin-toast';
let seq = 0;

/** Dispara um toast de qualquer client component do painel. */
export function toast(message: string, tone: ToastItem['tone'] = 'success') {
  window.dispatchEvent(new CustomEvent<ToastItem>(EVENT, { detail: { id: ++seq, message, tone } }));
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const onToast = (e: Event) => {
      const item = (e as CustomEvent<ToastItem>).detail;
      setItems((list) => [...list.slice(-2), item]);
      window.setTimeout(() => setItems((list) => list.filter((t) => t.id !== item.id)), 3800);
    };
    window.addEventListener(EVENT, onToast);
    return () => window.removeEventListener(EVENT, onToast);
  }, []);

  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2">
      <AnimatePresence initial={false}>
        {items.map((t) => (
          <m.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96, transition: { duration: 0.15 } }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-2.5 rounded-full bg-le-ink py-2.5 pl-3 pr-4 text-[13px] font-medium text-white shadow-[0_12px_40px_-8px_rgb(11_10_59/0.55)]"
          >
            {t.tone === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <CircleAlert className="h-4 w-4 text-red-400" />
            )}
            {t.message}
          </m.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
