'use client';

import { useRef, useState, useTransition } from 'react';
import { Loader2, Pencil } from 'lucide-react';
import { centsToCurrencyInput, formatCurrency } from '@/lib/format';
import { updateProductPrice } from '@/app/admin/produtos/_actions';
import { cn } from '@/lib/utils';
import { toast } from './toast';

/**
 * Preço editável direto na tabela: clique, digite, Enter salva, Esc cancela,
 * Tab salva e pula para o próximo preço (precificar o catálogo em sequência).
 */
export function ProductPriceInline({ id, name, priceCents }: { id: string; name: string; priceCents: number }) {
  const [value, setValue] = useState(priceCents);
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  function save(raw: string, focusNext = false) {
    setEditing(false);
    start(async () => {
      const res = await updateProductPrice(id, raw);
      if ('error' in res) return toast(res.error, 'error');
      if (res.priceCents !== value) toast(`${name}: ${res.priceCents ? formatCurrency(res.priceCents) : 'sob cotação'}`);
      setValue(res.priceCents);
    });
    if (focusNext) {
      const all = [...document.querySelectorAll<HTMLButtonElement>('[data-price-edit]')];
      all[all.findIndex((b) => b.dataset.priceEdit === id) + 1]?.click();
    }
  }

  if (editing) {
    return (
      <input
        ref={input}
        autoFocus
        defaultValue={value ? centsToCurrencyInput(value) : ''}
        placeholder="0 = sob cotação"
        inputMode="decimal"
        aria-label={`Preço de ${name}`}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={(e) => save(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
          if (e.key === 'Escape') { e.preventDefault(); setEditing(false); }
          if (e.key === 'Tab') { e.preventDefault(); save(e.currentTarget.value, true); }
        }}
        className="h-8 w-32 rounded-lg border border-le-blue bg-white px-2 text-right text-xs tabular-nums outline-none shadow-[0_0_0_3px_rgb(49_88_239/0.15)]"
      />
    );
  }

  return (
    <button
      type="button"
      data-price-edit={id}
      onClick={() => setEditing(true)}
      title="Clique para editar o preço"
      className={cn('group inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs tabular-nums transition-colors hover:bg-le-subtle', value ? 'font-semibold text-le-text' : 'text-le-muted')}
    >
      {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
      {value ? formatCurrency(value) : 'Sob cotação'}
      <Pencil className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}
