'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ExternalLink, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ADMIN_NAV } from './nav-items';

export function AdminNav({
  unreadCount = 0,
  inFabricationCount = 0,
  commissionsDueCount = 0,
  onNavigate,
}: {
  unreadCount?: number;
  inFabricationCount?: number;
  commissionsDueCount?: number;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  const counts = { unread: unreadCount, inFabrication: inFabricationCount, commissionsDue: commissionsDueCount };
  const groups = ADMIN_NAV.map((g) => ({
    ...g,
    items: g.items.map((i) => ({ ...i, badge: i.badgeKey ? counts[i.badgeKey] : 0 })),
  }));

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  return (
    <div className="flex h-full flex-col">
      <nav className="flex-1 space-y-6 p-4">
        {groups.map((group, gi) => (
          <div key={gi} className="space-y-1">
            {group.title && (
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                {group.title}
              </p>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs font-medium transition-[transform,opacity]',
                    active
                      ? 'bg-sidebar-accent text-white'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
                  )}
                >
                  {active && (
                    <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-le-blue-light" aria-hidden />
                  )}
                  <Icon className={cn('h-4 w-4', active ? 'text-le-blue-light' : 'text-sidebar-primary')} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge ? (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-bold text-white">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="space-y-1 border-t border-sidebar-border p-3">
        <Link
          href="/"
          target="_blank"
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <ExternalLink className="h-4 w-4" />
          Ver site
        </Link>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/60 transition-colors hover:bg-red-500/15 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </form>
      </div>
    </div>
  );
}
