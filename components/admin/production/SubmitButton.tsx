'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';

/** Botão que trava enquanto envia: evita lançar duas vezes com toque duplo no celular. */
export function SubmitButton({ children, variant, className }: { children: React.ReactNode; variant?: 'primary' | 'outline' | 'danger' | 'dark'; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} loading={pending} className={className}>
      {children}
    </Button>
  );
}
