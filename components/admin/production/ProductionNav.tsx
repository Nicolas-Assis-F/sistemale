import Link from 'next/link';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/admin/producao', label: 'Linha e estoque' },
  { href: '/admin/producao/inspecao', label: 'Inspeção' },
  { href: '/admin/producao/pagamentos', label: 'Equipe e pagamentos' },
] as const;

/** Classe dos campos nativos da produção: grandes para usar no celular, no galpão. */
export const fieldClass = 'h-11 w-full rounded-xl border border-le-line bg-white px-3 text-sm text-le-text focus:border-le-blue focus:outline-none focus:ring-2 focus:ring-le-blue/20';

/** Cabeçalho + abas + mensagem de retorno das ações (?ok= / ?erro=). */
export function ProductionNav({ active, title, description, flash }: {
  active: (typeof TABS)[number]['href']; title: string; description?: string; flash?: { ok?: string; erro?: string };
}) {
  return (
    <div className="space-y-5">
      <div>
        <p className="le-kicker">Produção de hastes</p>
        <h1 className="le-admin-title">{title}</h1>
        {description && <p className="mt-2 max-w-3xl text-sm text-le-muted">{description}</p>}
      </div>
      <nav aria-label="Seções da produção" className="-mx-1 flex gap-1 overflow-x-auto border-b border-le-line px-1">
        {TABS.map((t) => (
          <Link key={t.href} href={t.href} aria-current={active === t.href ? 'page' : undefined}
            className={cn('shrink-0 border-b-2 px-3 py-2.5 text-sm transition-colors',
              active === t.href ? 'border-le-blue font-medium text-le-blue' : 'border-transparent text-le-muted hover:text-le-text')}>
            {t.label}
          </Link>
        ))}
      </nav>
      {(flash?.ok || flash?.erro) && (
        <p role="status" className={cn('flex items-start gap-2 rounded-xl px-4 py-3 text-sm font-medium',
          flash.erro ? 'bg-amber-50 text-amber-800' : 'bg-le-success-surface text-le-success')}>
          {flash.erro ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
          {flash.erro ?? flash.ok}
        </p>
      )}
    </div>
  );
}

export function Panel({ title, hint, children, className }: { title: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-2xl border border-le-line bg-white p-4 sm:p-5', className)}>
      <h2 className="font-heading text-lg font-medium tracking-[-.03em] text-le-ink">{title}</h2>
      {hint && <p className="mt-1 text-xs text-le-muted">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-le-muted">{label}</span>
      {children}
    </label>
  );
}
