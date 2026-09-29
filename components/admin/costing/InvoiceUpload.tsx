'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { FileUp, Loader2 } from 'lucide-react';
import { importPurchaseInvoice } from '@/app/admin/custos/_actions';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="inline-flex h-9 items-center gap-2 rounded-lg bg-le-blue px-4 text-sm font-semibold text-white disabled:opacity-60">
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />} Importar
    </button>
  );
}

export function InvoiceUpload() {
  const [state, action] = useActionState(importPurchaseInvoice, undefined);
  const router = useRouter();
  useEffect(() => { if (state?.ok) router.refresh(); }, [state, router]);
  return (
    <form action={action} className="space-y-3 rounded-2xl border border-le-line bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        <input type="file" name="xml" accept=".xml,text/xml,application/xml" multiple required
          className="min-w-0 flex-1 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-le-tint file:px-3 file:py-2 file:text-sm file:font-medium file:text-le-blue" />
        <Submit />
      </div>
      <p className="text-xs text-le-muted">XML da NF-e (o arquivo que o fornecedor envia por e-mail ou que você baixa no portal da SEFAZ). Até 20 por vez. O PDF (DANFE) não serve: não tem os dados estruturados.</p>
      {state?.ok && <p className="rounded-lg bg-le-success-surface px-3 py-2 text-sm text-le-success">{state.ok}</p>}
      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
    </form>
  );
}
