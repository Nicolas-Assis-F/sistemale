import Link from 'next/link';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TEMPERATURE_LABELS, type Temperature } from '@/lib/leads/rules';

const TABS = [
  { href: '/admin/whatsapp', label: 'Contatos' },
  { href: '/admin/whatsapp/responder', label: 'Responder' },
  { href: '/admin/whatsapp/disparos', label: 'Disparos' },
  { href: '/admin/whatsapp/receber', label: 'A receber' },
] as const;

/** Cabeçalho + abas do CRM do WhatsApp + mensagem de retorno das ações (?ok= / ?erro=). */
export function LeadsNav({ active, title, description, flash, children }: {
  active: (typeof TABS)[number]['href'] | null; title: React.ReactNode; description?: React.ReactNode;
  flash?: { ok?: string; erro?: string }; children?: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="le-kicker">Clientes do WhatsApp</p>
          <h1 className="le-admin-title">{title}</h1>
          {description && <p className="mt-2 max-w-3xl text-sm text-le-muted">{description}</p>}
        </div>
        {children}
      </div>
      <nav aria-label="Seções do CRM" className="-mx-1 flex gap-1 overflow-x-auto border-b border-le-line px-1">
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
          flash.erro ? 'bg-le-warning-surface text-le-warning' : 'bg-le-success-surface text-le-success')}>
          {flash.erro ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
          {flash.erro ?? flash.ok}
        </p>
      )}
    </div>
  );
}

const TEMP_STYLE: Record<Temperature, string> = {
  QUENTE: 'bg-le-danger-surface text-le-danger',
  MORNO: 'bg-le-warning-surface text-le-warning',
  FRIO: 'bg-le-blue-light text-le-blue',
};

export function TemperatureBadge({ value }: { value: Temperature | null }) {
  if (!value) return <span className="text-le-muted">—</span>;
  return <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold', TEMP_STYLE[value])}>{TEMPERATURE_LABELS[value]}</span>;
}

export function Chip({ children, tone = 'muted' }: { children: React.ReactNode; tone?: 'muted' | 'blue' | 'success' | 'warn' }) {
  const style = { muted: 'bg-le-tint text-le-muted', blue: 'bg-le-blue-light text-le-blue', success: 'bg-le-success-surface text-le-success', warn: 'bg-le-warning-surface text-le-warning' }[tone];
  return <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium', style)}>{children}</span>;
}

const dayFmt = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: '2-digit' });
export const formatDay = (d: Date | null | undefined) => (d ? dayFmt.format(d) : '—');

/** "há 3 h", "há 5 dias" — para saber há quanto tempo o cliente espera. */
export function timeAgo(d: Date | null | undefined, now = Date.now()): string {
  if (!d) return '—';
  const min = Math.max(0, Math.round((now - d.getTime()) / 60_000));
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const days = Math.round(h / 24);
  return days < 60 ? `há ${days} dia${days > 1 ? 's' : ''}` : formatDay(d);
}
