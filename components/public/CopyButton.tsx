'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export function CopyButton({ value, label = 'Copiar', doneLabel = 'Copiado', className }: { value: string; label?: string; doneLabel?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(value).then(() => { setDone(true); setTimeout(() => setDone(false), 2000); })}
      className={className}
    >
      {done ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {done ? doneLabel : label}
    </button>
  );
}
