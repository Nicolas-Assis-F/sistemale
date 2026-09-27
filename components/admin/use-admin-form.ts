'use client';

import { useEffect } from 'react';
import { unstable_rethrow } from 'next/navigation';
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';
import { useEntitySheet } from './EntitySheet';
import { toast } from './toast';

/** Handles presentation-only sheet replies and existing field-validation errors. */
export function useAdminForm<T extends FieldValues>(form: UseFormReturn<T>, action: (data: FormData) => Promise<unknown>) {
  const sheet = useEntitySheet();
  const dirty = form.formState.isDirty;
  useEffect(() => { sheet?.setDirty(dirty); }, [dirty, sheet]);
  return async (values: T) => {
    const data = new FormData();
    Object.entries(values).forEach(([key, value]) => data.append(key, String(value ?? '')));
    if (sheet) data.set('_presentation', 'sheet');
    const handle = (result: unknown) => {
      if (result && typeof result === 'object' && 'error' in result) {
        const error = result.error;
        if (error && typeof error === 'object') {
          Object.entries(error).forEach(([key, messages]) => {
            if (Array.isArray(messages) && typeof messages[0] === 'string') form.setError(key as Path<T>, { message: messages[0] }, { shouldFocus: true });
          });
        }
        toast(typeof error === 'string' ? error : 'Revise os campos indicados.', 'error');
      } else if (result && typeof result === 'object' && 'ok' in result) sheet?.saved();
    };
    // Standalone actions retain Next's redirect; sheet actions explicitly return a result.
    if (!sheet) { handle(await action(data)); return; }
    try { handle(await action(data)); }
    catch (error) { unstable_rethrow(error); toast('Não foi possível salvar. Tente novamente.', 'error'); }
  };
}
