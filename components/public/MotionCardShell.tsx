'use client';

import { m } from 'motion/react';

interface Props {
  children: React.ReactNode;
  className?: string;
}

/** Wrapper de hover-lift para cards (CategoryCard/ProductCard) via `m` do LazyMotion. */
export function MotionCardShell({ children, className }: Props) {
  return (
    <m.div
      className={className}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
    >
      {children}
    </m.div>
  );
}
