import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { MessageCircle } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { formatCurrency } from '@/lib/format';
import { buttonVariants } from '@/components/ui/button';
import { AdminFilters } from '@/components/admin/AdminFilters';
import { Field, Panel, fieldClass } from '@/components/admin/production/ProductionNav';
import { SubmitButton } from '@/components/admin/production/SubmitButton';
import { Chip, LeadsNav, TemperatureBadge, formatDay, timeAgo } from '@/components/admin/leads/LeadsNav';
import { KIND_LABELS, SEGMENT_CODES, STAGE_LABELS, awaitingReply, formatPhone, segmentLabel, whatsappLink } from '@/lib/leads/rules';
import { createLead } from './_actions';

type Params = { q?: string; interesse?: string; produto?: string; tipo?: string; agenda?: string; situacao?: string; ok?: string; erro?: string };

const PAGE = 150;

export default async function LeadsPage({ searchParams }: { searchParams: Promise<Params> }) {
  await requireAdmin();
  const p = await searchParams;
  const q = p.q?.trim();
  const where: Prisma.LeadWhereInput = {
    AND: [
      q ? { OR: [
        { name: { contains: q, mode: 'insensitive' } }, { savedName: { contains: q, mode: 'insensitive' } },
        { pushName: { contains: q, mode: 'insensitive' } }, { phone: { contains: q.replace(/\D/g, '') || q } },
        { equipment: { contains: q, mode: 'insensitive' } }, { city: { contains: q, mode: 'insensitive' } },
        { summary: { contains: q, mode: 'insensitive' } },
      ] } : {},
      p.interesse === 'SEM' ? { temperature: null } : p.interesse ? { temperature: p.interesse as 'QUENTE' | 'MORNO' | 'FRIO' } : {},
      p.produto ? { segments: { has: p.produto } } : {},
      p.tipo ? { kind: p.tipo } : {},
      p.agenda === 'nao' ? { savedName: null } : p.agenda === 'sim' ? { savedName: { not: null } } : {},
      p.situacao === 'cliente' ? { isCustomer: true } : {},
      p.situacao === 'receber' ? { receivables: { some: { paidAt: null } } } : {},
    ],
  };
  const select = {
    id: true, name: true, phone: true, savedName: true, kind: true, isCustomer: true, city: true, temperature: true, stage: true,
    segments: true, equipment: true, lastInboundAt: true, lastOutboundAt: true, lastMessageAt: true,
    purchases: { orderBy: { date: { sort: 'desc', nulls: 'last' } }, take: 1, select: { item: true, date: true } },
    receivables: { where: { paidAt: null }, select: { amountCents: true } },
  } satisfies Prisma.LeadSelect;
  const [all, stats] = await Promise.all([
    prisma.lead.findMany({ where, select, orderBy: [{ isCustomer: 'desc' }, { temperature: { sort: 'asc', nulls: 'last' } }, { lastMessageAt: { sort: 'desc', nulls: 'last' } }] }),
    prisma.lead.findMany({ select: { isCustomer: true, temperature: true, savedName: true, lastInboundAt: true, lastOutboundAt: true } }),
  ]);
  const rows = (p.situacao === 'aguardando' ? all.filter(awaitingReply) : all).slice(0, PAGE);
  const total = p.situacao === 'aguardando' ? all.filter(awaitingReply).length : all.length;
  const toReceive = await prisma.leadReceivable.aggregate({ where: { paidAt: null }, _sum: { amountCents: true }, _count: true });
  const kpis = [
    { label: 'Contatos de perfuração', value: stats.length, detail: `${stats.filter((s) => !s.savedName).length} não salvos na agenda`, href: '/admin/whatsapp?agenda=nao' },
    { label: 'Clientes que compraram', value: stats.filter((s) => s.isCustomer).length, detail: 'Portfólio', href: '/admin/whatsapp?situacao=cliente' },
    { label: 'Interesse quente', value: stats.filter((s) => s.temperature === 'QUENTE').length, detail: `${stats.filter((s) => s.temperature === 'MORNO').length} mornos`, href: '/admin/whatsapp?interesse=QUENTE' },
    { label: 'Esperando sua resposta', value: stats.filter(awaitingReply).length, detail: 'Falaram por último', href: '/admin/whatsapp/responder' },
    { label: 'A receber', value: formatCurrency(toReceive._sum.amountCents ?? 0), detail: `${toReceive._count} parcela(s) em aberto`, href: '/admin/whatsapp/receber' },
  ];

  return (
    <div className="le-admin-page">
      <LeadsNav active="/admin/whatsapp" title="Contatos" flash={p}
        description="Poceiros, donos de máquina e clientes lidos das conversas (inclusive áudios). Filtre por interesse e produto, abra a ficha para ver o que cada um usa, comprou e deve.">
        <a href="/admin/whatsapp/agenda.vcf" className={buttonVariants({ variant: 'outline' })}>Baixar não salvos (.vcf)</a>
      </LeadsNav>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href} className="rounded-2xl border border-le-line bg-white p-4 transition-shadow hover:shadow-md">
            <p className="text-xs text-le-muted">{k.label}</p>
            <p className="mt-3 font-heading text-2xl font-medium tracking-[-.05em] text-le-ink sm:text-3xl">{k.value}</p>
            <p className="mt-2 text-[11px] text-le-muted">{k.detail}</p>
          </Link>
        ))}
      </div>

      <AdminFilters placeholder="Buscar nome, telefone, cidade ou material" filters={[
        { name: 'interesse', label: 'Interesse', options: [{ value: '', label: 'Todos' }, { value: 'QUENTE', label: 'Quente' }, { value: 'MORNO', label: 'Morno' }, { value: 'FRIO', label: 'Frio' }, { value: 'SEM', label: 'Sem classificação' }] },
        { name: 'produto', label: 'Produto / material', options: [{ value: '', label: 'Todos' }, ...SEGMENT_CODES.map((s) => ({ value: s, label: segmentLabel(s) }))] },
        { name: 'tipo', label: 'Tipo', options: [{ value: '', label: 'Todos' }, ...Object.entries(KIND_LABELS).map(([value, label]) => ({ value, label }))] },
        { name: 'situacao', label: 'Situação', options: [{ value: '', label: 'Todas' }, { value: 'cliente', label: 'Já compraram' }, { value: 'aguardando', label: 'Esperando resposta' }, { value: 'receber', label: 'Com parcela a receber' }] },
        { name: 'agenda', label: 'Agenda', options: [{ value: '', label: 'Todos' }, { value: 'nao', label: 'Não salvos' }, { value: 'sim', label: 'Salvos' }] },
      ]} />

      <p className="text-xs text-le-muted">{total} contato(s){total > PAGE ? ` · mostrando os ${PAGE} primeiros, refine a busca` : ''}</p>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-le-line bg-le-surface px-5 py-12 text-center text-sm text-le-muted">
          {stats.length === 0 ? 'Nenhum contato importado ainda. Rode npm run crm:import com a leitura das conversas.' : 'Nenhum contato com esses filtros.'}
        </div>
      ) : (
        <ul className="grid gap-3 xl:gap-0 xl:divide-y xl:divide-le-line xl:overflow-hidden xl:rounded-2xl xl:border xl:border-le-line xl:bg-le-surface">
          {rows.map((l) => {
            const owed = l.receivables.reduce((s, r) => s + r.amountCents, 0);
            const waiting = awaitingReply(l);
            const last = l.purchases[0];
            return (
              <li key={l.id} className="grid gap-3 rounded-2xl border border-le-line bg-le-surface p-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1.6fr)_minmax(0,1fr)_auto] xl:items-center xl:gap-6 xl:rounded-none xl:border-0 xl:px-5">
                <div className="min-w-0">
                  <Link href={`/admin/whatsapp/${l.id}`} className="font-medium text-le-ink hover:text-le-blue">{l.name}</Link>
                  <p className="mt-0.5 text-xs text-le-muted">{formatPhone(l.phone)}{l.city ? ` · ${l.city}` : ''}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {l.isCustomer && <Chip tone="success">Cliente</Chip>}
                    {l.kind && !l.isCustomer && <Chip>{KIND_LABELS[l.kind] ?? l.kind}</Chip>}
                    {!l.savedName && <Chip tone="warn">Não salvo</Chip>}
                  </div>
                </div>
                <div className="min-w-0 text-sm">
                  <p className="line-clamp-2 text-le-text">{l.equipment || <span className="text-le-muted">Material não identificado</span>}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">{l.segments.slice(0, 4).map((s) => <Chip key={s} tone="blue">{segmentLabel(s)}</Chip>)}</div>
                </div>
                <dl className="grid grid-cols-2 gap-3 text-xs xl:grid-cols-1 xl:gap-1.5">
                  <div className="flex items-center gap-2"><dt className="sr-only">Interesse</dt><dd><TemperatureBadge value={l.temperature} /></dd>{l.stage && <dd className="text-le-muted">{STAGE_LABELS[l.stage] ?? l.stage}</dd>}</div>
                  <div><dt className="inline text-le-muted">Última compra: </dt><dd className="inline">{last ? `${last.item.slice(0, 40)}${last.date ? ` (${formatDay(last.date)})` : ''}` : '—'}</dd></div>
                  {owed > 0 && <div><dt className="inline text-le-muted">A receber: </dt><dd className="inline font-semibold text-le-danger">{formatCurrency(owed)}</dd></div>}
                  <div><dt className="inline text-le-muted">Conversa: </dt><dd className={waiting ? 'inline font-semibold text-le-warning' : 'inline'}>{waiting ? `esperando você ${timeAgo(l.lastInboundAt)}` : timeAgo(l.lastMessageAt)}</dd></div>
                </dl>
                <div className="flex gap-2 xl:justify-end">
                  <a href={whatsappLink(l.phone)} target="_blank" rel="noreferrer" className={buttonVariants({ variant: 'outline', size: 'sm' })}><MessageCircle className="size-4" /> WhatsApp</a>
                  <Link href={`/admin/whatsapp/${l.id}`} className={buttonVariants({ size: 'sm' })}>Ficha</Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Panel title="Cadastrar contato" hint="Cliente novo que ainda não apareceu na leitura do WhatsApp.">
        <form action={createLead} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label="Nome"><input name="name" required className={fieldClass} placeholder="João Poços" /></Field>
          <Field label="WhatsApp"><input name="phone" required inputMode="tel" className={fieldClass} placeholder="62 99999-9999" /></Field>
          <SubmitButton>Cadastrar</SubmitButton>
        </form>
      </Panel>
    </div>
  );
}
