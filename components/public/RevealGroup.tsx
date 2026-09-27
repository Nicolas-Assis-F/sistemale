interface Props {
  children: React.ReactNode;
  className?: string;
}

/** Grade estática: as fichas permanecem acessíveis mesmo sem IntersectionObserver. */
export function RevealGroup({ children, className }: Props) {
  return <div className={className}>{children}</div>;
}
