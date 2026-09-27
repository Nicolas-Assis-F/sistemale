import type { ReactNode } from 'react';

export function OrderFormSection({ id, children }: { id: string; children: ReactNode }) {
  return <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-28 rounded-2xl border border-le-line bg-le-surface p-4 sm:p-5">{children}</section>;
}
