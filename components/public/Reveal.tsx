interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Mantido para compatibilidade com as chamadas existentes. */
  delay?: number;
}

/** Conteúdo sempre visível, inclusive sem JavaScript e ao navegar por âncoras. */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  return (
    <div className={className} style={delay ? { animationDelay: `${delay}ms` } : undefined}>{children}</div>
  );
}
