'use client';

import { Trash2 } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { useDeleteAction } from './use-delete-action';

interface ConfirmDeleteButtonProps {
  action: () => Promise<{ error: string } | { ok: true }>;
  confirmMessage: string;
  label?: string; // se omitido, renderiza só o ícone
  onSuccess?: () => void;
  className?: string;
}

export function ConfirmDeleteButton({
  action,
  confirmMessage,
  label,
  onSuccess,
  className,
}: ConfirmDeleteButtonProps) {
  const { run, isPending, error } = useDeleteAction(action);

  const defaultClassName = label
    ? buttonVariants({ variant: 'ghost', size: 'sm' }) +
      ' gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10'
    : 'p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50';

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <Button variant="ghost" size="sm"
        type="button"
        loading={isPending}
        onClick={() => run(confirmMessage, onSuccess)}
        title={label ? undefined : 'Excluir'}
        className={className ?? defaultClassName}
      >
        <Trash2 className="h-3.5 w-3.5" />
        {label}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
