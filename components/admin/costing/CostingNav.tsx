import Link from 'next/link';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/admin/custos', label: 'Fichas e preços' },
  { href: '/admin/custos/materiais', label: 'Materiais' },
  { href: '/admin/custos/processos', label: 'Processos e mão de obra' },
  { href: '/admin/custos/notas', label: 'Notas de compra' },
  { href: '/admin/custos/config', label: 'Impostos e margem' },
] as const;

/** Cabeçalho + abas do módulo de custos. */
export function CostingNav({ active, title, description, actions }: { active: (typeof TABS)[number]['href']; title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="le-kicker">Custos e preços</p>
          <h1 className="le-admin-title">{title}</h1>
          {description && <p className="mt-2 max-w-3xl text-sm text-le-muted">{description}</p>}
        </div>
        {actions}
      </div>
      <nav aria-label="Seções de custos" className="-mx-1 flex gap-1 overflow-x-auto border-b border-le-line px-1">
        {TABS.map((t) => (
          <Link key={t.href} href={t.href} aria-current={active === t.href ? 'page' : undefined}
            className={cn('shrink-0 border-b-2 px-3 py-2.5 text-sm transition-colors',
              active === t.href ? 'border-le-blue font-medium text-le-blue' : 'border-transparent text-le-muted hover:text-le-text')}>
            {t.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
