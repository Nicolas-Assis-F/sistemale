'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Loader2, LogOut, Package, UserRound } from 'lucide-react';
import { customerAuthClient } from '@/lib/customer-auth-client';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/conta', label: 'Meus pedidos', icon: Package, match: (p: string) => p === '/conta' || p.startsWith('/conta/pedidos') },
  { href: '/conta/dados', label: 'Meus dados', icon: UserRound, match: (p: string) => p.startsWith('/conta/dados') },
];

export function AccountNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <nav aria-label="Minha conta" className="flex items-center gap-1 overflow-x-auto">
      {TABS.map(({ href, label, icon: Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn('flex h-10 items-center gap-2 whitespace-nowrap rounded-xl px-4 text-sm font-medium transition-colors', active ? 'bg-le-ink text-white' : 'text-le-muted hover:bg-le-subtle hover:text-le-text')}
          >
            <Icon className="h-4 w-4" /> {label}
          </Link>
        );
      })}
      <button
        onClick={() => start(async () => { await customerAuthClient.signOut(); router.replace('/'); router.refresh(); })}
        className="ml-auto flex h-10 items-center gap-2 rounded-xl px-3 text-sm text-le-muted transition-colors hover:bg-le-danger-surface hover:text-le-danger"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} Sair
      </button>
    </nav>
  );
}
