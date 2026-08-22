'use client';

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
      const result = await action();
      if (result && typeof result === 'object' && 'error' in result) {
        setError((result as { error: string }).error);
        return;
      }
      onSuccess?.(result as T);
    });
  }

  return { run, isPending, error };
}
