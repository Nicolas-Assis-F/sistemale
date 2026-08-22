'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-md rounded-2xl border border-destructive/20 bg-card p-6 text-center shadow-card">
        <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-destructive" />
        <h2 className="text-lg font-semibold">Ocorreu um erro inesperado</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">Tente novamente. Se o problema persistir, contate o suporte técnico.</p>
        <Button className="mt-4" onClick={() => reset()}>Tentar novamente</Button>
      </div>
    </div>
  );
}
