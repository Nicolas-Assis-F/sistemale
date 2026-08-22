'use client';

import { buttonVariants } from '@/components/ui/button';

export default function Error({
  error: _error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <div className="container mx-auto flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-sm text-muted-foreground">Não foi possível carregar esta página.</p>
      <button onClick={() => unstable_retry()} className={buttonVariants({ size: 'sm' })}>
        Tentar novamente
      </button>
    </div>
  );
}
