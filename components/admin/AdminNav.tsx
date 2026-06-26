'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, Tag, ShoppingCart, FileText, Wrench, Images,
  MessageSquare, ExternalLink, LogOut, type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  badge?: number;
}

interface NavGroup {
  title?: string;
  items: NavItem[];
}

export function AdminNav({ unreadCount = 0, onNavigate }: { unreadCount?: number; onNavigate?: () => void }) {
  const pathname = usePathname();

  const groups: NavGroup[] = [
    { items: [{ href: '/admin', icon: LayoutDashboard, label: 'Dashboard' }] },
    {
      title: 'Catálogo',
      items: [
        { href: '/admin/produtos', icon: Package, label: 'Produtos' },
        { href: '/admin/categorias', icon: Tag, label: 'Categorias' },
        { href: '/admin/lista-compras', icon: ShoppingCart, label: 'Lista de Compras' },
      ],
    },
    {
      title: 'Site institucional',
      items: [
        { href: '/admin/conteudo', icon: FileText, label: 'Conteúdo' },
        { href: '/admin/servicos', icon: Wrench, label: 'Serviços' },
        { href: '/admin/galeria', icon: Images, label: 'Galeria' },
      ],
    },
    {
      title: 'Comunicação',
      items: [{ href: '/admin/mensagens', icon: MessageSquare, label: 'Mensagens', badge: unreadCount }],
    },
  ];

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  return (
    <div className="flex h-full flex-col">
      <nav className="flex-1 space-y-5 p-3">
        {groups.map((group, gi) => (
          <div key={gi} className="space-y-1">
            {group.title && (
              <p className="px-3 pb-1 text-[0.65rem] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
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
                    'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                >
                  <Icon className={cn('h-4 w-4', active ? '' : 'text-sidebar-primary')} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge ? (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[0.65rem] font-bold text-white">
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
