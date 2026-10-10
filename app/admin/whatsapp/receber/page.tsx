import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { Panel } from '@/components/admin/production/ProductionNav';
import { LeadsNav, formatDay } from '@/components/admin/leads/LeadsNav';
import { whatsappLink } from '@/lib/leads/rules';
import { toggleReceivablePaid } from '../_actions';

export default async function ReceivablesPage({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  await requireAdmin();
  const flash = await searchParams;
  const now = Date.now();
  const [open, notes] = await Promise.all([
    prisma.leadReceivable.findMany({
      where: { paidAt: null }, orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }],
      include: { lead: { select: { id: true, name: true, phone: true } } },
    }),
    prisma.lead.findMany({
      where: { balanceNote: { not: null }, receivables: { none: {} } },
      select: { id: true, name: true, balanceNote: true }, orderBy: { name: 'asc' },
    }),
  ]);
  const total = open.reduce((s, r) => s + r.amountCents, 0);
  const late = open.filter((r) => r.dueDate && r.dueDate.getTime() < now);
  const in30 = open.filter((r) => r.dueDate && r.dueDate.getTime() >= now && r.dueDate.getTime() < now + 30 * 86_400_000);

  return (
    <div className="le-admin-page">
      <LeadsNav active="/admin/whatsapp/receber" title="A receber" flash={flash}
        description="Parcelas combinadas pelo WhatsApp que ainda não caíram. Cobre pelo botão do WhatsApp e marque quando receber." />

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total em aberto', value: formatCurrency(total), detail: `${open.length} parcela(s)` },
          { label: 'Vencidas', value: formatCurrency(late.reduce((s, r) => s + r.amountCents, 0)), detail: `${late.length} parcela(s)`, danger: late.length > 0 },
          { label: 'Próximos 30 dias', value: formatCurrency(in30.reduce((s, r) => s + r.amountCents, 0)), detail: `${in30.length} parcela(s)` },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-le-line bg-white p-4">
            <p className="text-xs text-le-muted">{k.label}</p>
            <p className={cn('mt-2 font-heading text-xl font-medium tracking-[-.04em] sm:text-2xl', k.danger ? 'text-le-danger' : 'text-le-ink')}>{k.value}</p>
            <p className="mt-1 text-[11px] text-le-muted">{k.detail}</p>
          </div>
        ))}
      </div>

      <Panel title="Parcelas em aberto">
        {open.length === 0 ? <p className="text-sm text-le-muted">Nada a receber.</p> : (
          <ul className="divide-y divide-le-line/60 text-sm">
            {open.map((r) => {
              const isLate = r.dueDate && r.dueDate.getTime() < now;
              return (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link href={`/admin/whatsapp/${r.lead.id}`} className="font-medium text-le-ink hover:text-le-blue">{r.lead.name}</Link>
                    <p className="text-xs text-le-muted">{r.description} · <span className={isLate ? 'font-semibold text-le-danger' : ''}>{r.dueDate ? `${isLate ? 'venceu' : 'vence'} ${formatDay(r.dueDate)}` : 'sem vencimento'}</span></p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums font-semibold">{formatCurrency(r.amountCents)}</span>
                    <a href={whatsappLink(r.lead.phone)} target="_blank" rel="noreferrer" className={buttonVariants({ variant: 'outline', size: 'sm' })}><MessageCircle className="size-4" /> Cobrar</a>
                    <form action={toggleReceivablePaid.bind(null, r.lead.id, r.id, '/admin/whatsapp/receber')}><button className={buttonVariants({ size: 'sm' })}>Recebi</button></form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {notes.length > 0 && (
        <Panel title="Saldo citado na conversa, sem parcela lançada" hint="Confira o valor e lance as parcelas na ficha do cliente.">
          <ul className="divide-y divide-le-line/60 text-sm">
            {notes.map((l) => (
              <li key={l.id} className="py-2.5"><Link href={`/admin/whatsapp/${l.id}`} className="font-medium text-le-ink hover:text-le-blue">{l.name}</Link><p className="text-xs text-le-muted">{l.balanceNote}</p></li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
