'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw, Play } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from './toast';

type Result = { ok: true; message: string } | { error: string };

export function JobActionButton({ action, label, kind }: { action: () => Promise<Result>; label: string; kind: 'retry' | 'run' }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const Icon = kind === 'retry' ? RotateCcw : Play;
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(async () => {
        const res = await action();
        if ('error' in res) toast(res.error, 'error');
        else toast(res.message);
        router.refresh();
      })}
      className={cn(buttonVariants({ variant: kind === 'run' ? 'default' : 'outline', size: 'sm' }), 'gap-1.5', pending && 'opacity-70')}
    >
      <Icon size={14} className={pending ? 'animate-spin' : undefined} /> {pending ? 'Processando…' : label}
    </button>
  );
}
