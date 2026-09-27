'use client';

import { useOptimistic, useTransition } from 'react';
import { Star } from 'lucide-react';
import { toggleProductFlag } from '@/app/admin/produtos/_actions';
import { cn } from '@/lib/utils';
import { toast } from './toast';

/**
 * Edição inline na tabela: um clique publica/arquiva ou marca destaque.
 * Atualização otimista — a UI muda na hora e reverte se o servidor recusar.
 */
export function ProductFlagToggle({ id, field, value, name }: { id: string; field: 'active' | 'featured'; value: boolean; name: string }) {
  const [optimistic, setOptimistic] = useOptimistic(value);
  const [pending, startTransition] = useTransition();

  function flip() {
    const next = !optimistic;
    startTransition(async () => {
      setOptimistic(next);
      const res = await toggleProductFlag(id, field, next);
      if ('error' in res) toast(res.error, 'error');
      else if (field === 'active') toast(next ? `“${name}” publicado na vitrine` : `“${name}” arquivado`);
    });
  }

  if (field === 'featured') {
    return (
      <button
        type="button"
        onClick={flip}
        aria-pressed={optimistic}
        aria-label={optimistic ? `Remover ${name} dos destaques` : `Destacar ${name} na home`}
        title={optimistic ? 'Em destaque na home' : 'Destacar na home'}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-lg border transition-[transform,opacity] active:scale-90',
          optimistic ? 'border-le-yellow/60 bg-le-warning-surface text-le-warning' : 'border-transparent text-[#c3c6d6] hover:border-border hover:text-le-muted',
          pending && 'opacity-70',
        )}
      >
        <Star className={cn('h-3.5 w-3.5 transition-transform', optimistic && 'scale-110 fill-current')} />
      </button>
    );
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={optimistic}
      onClick={flip}
      aria-label={`${optimistic ? 'Arquivar' : 'Publicar'} ${name}`}
      className={cn(
        'group inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 text-[11px] font-medium transition-colors',
        optimistic ? 'bg-le-subtle text-le-success hover:bg-le-success-surface' : 'bg-le-subtle text-le-muted hover:bg-le-line',
        pending && 'opacity-70',
      )}
    >
      <span className={cn('relative h-4 w-7 rounded-full transition-colors', optimistic ? 'bg-le-success' : 'bg-le-line')}>
        <span className={cn('absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-[left] duration-200', optimistic ? 'left-3.5' : 'left-0.5')} />
      </span>
      {optimistic ? 'Publicado' : 'Arquivado'}
    </button>
  );
}
