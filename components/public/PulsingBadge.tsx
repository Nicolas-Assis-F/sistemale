'use client';

import { m } from 'motion/react';

interface Props {
  children: React.ReactNode;
  className?: string;
}

/** Envolve um badge com um pulso sutil e contínuo (opacidade), para chamar atenção sem exagero. */
export function PulsingBadge({ children, className }: Props) {
  return (
    <m.span
      className={className}
      animate={{ opacity: [1, 0.6, 1] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    >
      {children}
    </m.span>
  );
}
