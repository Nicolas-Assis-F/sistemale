import type { ReactNode } from 'react';

export function Entrance({ children, className = '' }: { children: ReactNode; className?: string; delay?: number }) {
  return <div className={className}>{children}</div>;
}
