'use client';

import { toast } from './toast';
import { useState, useTransition } from 'react';

export function useDeleteAction<T = { ok: true }>(
  action: () => Promise<{ error: string } | T>,
) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(confirmMessage: string, onSuccess?: (result: T) => void) {
    if (!confirm(confirmMessage)) return;
    setError(null);
    startTransition(async () => {
      try {
      const result = await action();
      if (result && typeof result === 'object' && 'error' in result) {
        setError((result as { error: string }).error);
        return;
      }
      toast("Registro excluído");
      onSuccess?.(result as T);
      } catch { setError("Não foi possível excluir. Tente novamente."); toast("Não foi possível excluir.", "error"); }
    });
  }

  return { run, isPending, error };
}
