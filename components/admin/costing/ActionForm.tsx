'use client';

import { useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/admin/toast';

type Result = { ok: true; message?: string } | { error: string };

/** Formulário que chama uma Server Action, mostra o resultado em toast e atualiza a página. */
export function ActionForm({ action, children, className, resetOnSuccess = false, onDone }: {
  action: (fd: FormData) => Promise<Result>; children: React.ReactNode; className?: string; resetOnSuccess?: boolean; onDone?: () => void;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form ref={ref} className={className} aria-busy={pending}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const res = await action(fd);
          if ('error' in res) return toast(res.error, 'error');
          toast(res.message ?? 'Salvo.');
          if (resetOnSuccess) ref.current?.reset();
          onDone?.();
          router.refresh();
        });
      }}>
      <fieldset disabled={pending} className="contents">{children}</fieldset>
    </form>
  );
}

/** Botão que dispara uma Server Action sem formulário (com confirmação opcional). */
export function ActionButton({ action, children, className, confirm }: { action: () => Promise<Result>; children: React.ReactNode; className?: string; confirm?: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button type="button" disabled={pending} className={className}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        start(async () => {
          const res = await action();
          if ('error' in res) toast(res.error, 'error');
          else { toast(res.message ?? 'Feito.'); router.refresh(); }
        });
      }}>
      {children}
    </button>
  );
}

export const inputCls = 'h-9 w-full min-w-0 rounded-lg border border-le-line bg-white px-2.5 text-sm outline-none transition-colors focus:border-le-blue focus:ring-3 focus:ring-le-blue/15 disabled:opacity-60';
export const labelCls = 'block space-y-1 text-xs font-medium text-le-muted';
