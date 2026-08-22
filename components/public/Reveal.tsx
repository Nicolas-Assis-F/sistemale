'use client';

import { m } from 'motion/react';

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Atraso da animação em ms (para escalonar seções/itens). */
  delay?: number;
}

/**
 * Revela o conteúdo com um fade + subida sutil quando entra na viewport.
 * Usa `motion` (via LazyMotion/`m`, ver MotionProvider) e respeita
 * `prefers-reduced-motion` através do `MotionConfig` do provider.
 */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 0.5, delay: delay / 1000, ease: 'easeOut' }}
    >
      {children}
    </m.div>
  );
}
