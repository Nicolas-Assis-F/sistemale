'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * Enquanto houver pagamento pendente, recarrega os dados da página (do nosso
 * servidor, nunca do Asaas) com intervalo crescente, até ~20 min. A confirmação
 * chega pelo webhook; aqui só mostramos quando ela já estiver gravada.
 */
export function PaymentWatcher({ active }: { active: boolean }) {
  const router = useRouter();
  const [checks, setChecks] = useState(0);
  const done = !active || checks >= 60;

  useEffect(() => {
    if (done) return;
    const delay = checks < 12 ? 5_000 : checks < 30 ? 15_000 : 30_000;
    const t = setTimeout(() => {
      if (document.visibilityState === 'visible') router.refresh();
      setChecks((c) => c + 1);
    }, delay);
    return () => clearTimeout(t);
  }, [checks, done, router]);

  if (!active) return null;
  return (
    <p aria-live="polite" className="mb-4 flex max-w-4xl items-center gap-2 text-xs text-le-muted">
      {done
        ? 'Já pagou? Atualize a página em alguns instantes para ver a confirmação.'
        : <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Aguardando a confirmação do pagamento — esta página atualiza sozinha.</>}
    </p>
  );
}
