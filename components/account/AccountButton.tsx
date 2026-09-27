'use client';

import Link from 'next/link';
import { UserRound } from 'lucide-react';
import { customerAuthClient } from '@/lib/customer-auth-client';
import { cn } from '@/lib/utils';

/** "Entrar" / "Minha conta" no header (sessão do cliente, lida no navegador). */
export function AccountButton({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const { data, isPending } = customerAuthClient.useSession();
  const name = data?.user.name?.split(' ')[0];
  return (
    <Link
      href={data ? '/conta' : '/conta/entrar'}
      onClick={onNavigate}
      aria-label={data ? `Minha conta (${name})` : 'Entrar na área do cliente'}
      className={cn(
        'inline-flex h-11 items-center gap-2 rounded-xl border border-le-line bg-white px-3.5 text-sm font-medium text-le-text transition-colors hover:border-le-blue-border hover:text-le-blue',
        isPending && 'opacity-70',
        className,
      )}
    >
      <span className={cn('flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold', data ? 'bg-le-ink text-le-yellow' : 'bg-le-subtle text-le-muted')}>
        {data ? name?.[0]?.toUpperCase() : <UserRound className="h-3.5 w-3.5" />}
      </span>
      <span className="hidden md:inline">{data ? 'Minha conta' : 'Entrar'}</span>
    </Link>
  );
}
