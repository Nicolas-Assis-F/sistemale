'use client';

import { useId, useState } from 'react';
import { formatTaxId, maskTaxId } from '@/lib/domains/customers/tax-id';

export function MaskedDoc({ value }: { value: string }) {
  const id = useId();
  const [revealedValue, setRevealedValue] = useState<string | null>(null);
  const visible = revealedValue === value;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2">
      <span id={id} className="whitespace-nowrap tabular-nums">{visible ? formatTaxId(value) : maskTaxId(value)}</span>
      <button type="button" aria-controls={id} aria-expanded={visible}
        onClick={() => setRevealedValue(visible ? null : value)}
        className="inline-flex min-h-11 items-center rounded px-2 text-xs font-medium text-le-blue underline underline-offset-2 focus-visible:outline-2">
        {visible ? 'ocultar' : 'mostrar'}
      </button>
    </span>
  );
}
