import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { Panel } from '@/components/admin/production/ProductionNav';
import { Chip, LeadsNav, TemperatureBadge, timeAgo } from '@/components/admin/leads/LeadsNav';
import { awaitingReply, formatPhone, segmentLabel, whatsappLink } from '@/lib/leads/rules';

export default async function ReplyPage() {
  await requireAdmin();
  const now = Date.now();
  const [leads, replies, lastSync] = await Promise.all([
    prisma.lead.findMany({
      where: { lastInboundAt: { not: null } },
      select: { id: true, name: true, phone: true, isCustomer: true, temperature: true, segments: true, lastInboundAt: true, lastOutboundAt: true, lastMessage: true, nextStep: true },
      orderBy: { lastInboundAt: 'desc' },
    }),
    prisma.leadDispatch.findMany({
      where: { status: 'RESPONDEU', repliedAt: { gte: new Date(now - 30 * 86_400_000) } },
      orderBy: { repliedAt: 'desc' }, take: 50,
      include: { lead: { select: { id: true, name: true, phone: true, lastInboundAt: true, lastOutboundAt: true } }, campaign: { select: { name: true } } },
    }),
    prisma.lead.aggregate({ _max: { lastMessageAt: true } }),
  ]);
  const waiting = leads.filter(awaitingReply);
  // Cliente que comprou e quem está quente vêm primeiro; dentro de cada grupo, quem espera há mais tempo.
  const rank = (l: (typeof waiting)[number]) => (l.isCustomer ? 0 : l.temperature === 'QUENTE' ? 1 : l.temperature === 'MORNO' ? 2 : 3);
  waiting.sort((a, b) => rank(a) - rank(b) || a.lastInboundAt!.getTime() - b.lastInboundAt!.getTime());

  return (
    <div className="le-admin-page">
      <LeadsNav active="/admin/whatsapp/responder" title="Responder"
        description={<>Contatos que mandaram mensagem e ainda não tiveram resposta: clientes e quentes primeiro. Dados do WhatsApp até {lastSync._max.lastMessageAt ? timeAgo(lastSync._max.lastMessageAt, now) : '—'} (atualize com <code className="rounded bg-le-tint px-1">npm run crm:sync</code>).</>} />

      <Panel title={`Esperando você (${waiting.length})`}>
        {waiting.length === 0 ? <p className="text-sm text-le-muted">Ninguém esperando resposta.</p> : (
          <ul className="divide-y divide-le-line/60">
            {waiting.map((l) => {
              const hours = (now - l.lastInboundAt!.getTime()) / 3_600_000;
              return (
                <li key={l.id} className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/whatsapp/${l.id}`} className="font-medium text-le-ink hover:text-le-blue">{l.name}</Link>
                      {l.isCustomer && <Chip tone="success">Cliente</Chip>}
                      <TemperatureBadge value={l.temperature} />
                      <span className={cn('text-xs', hours > 24 ? 'font-semibold text-le-danger' : 'text-le-warning')}>esperando {timeAgo(l.lastInboundAt, now).replace('há ', '')}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-le-text">{l.lastMessage ?? '—'}</p>
                    <p className="mt-0.5 text-xs text-le-muted">{formatPhone(l.phone)}{l.segments.length ? ` · ${l.segments.slice(0, 3).map(segmentLabel).join(', ')}` : ''}{l.nextStep ? ` · ${l.nextStep}` : ''}</p>
                  </div>
                  <a href={whatsappLink(l.phone)} target="_blank" rel="noreferrer" className={buttonVariants({ size: 'sm' })}><MessageCircle className="size-4" /> Responder</a>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel title="Respostas dos disparos (30 dias)" hint="Quem respondeu a uma campanha. Abra a conversa e continue a venda.">
        {replies.length === 0 ? <p className="text-sm text-le-muted">Nenhuma resposta ainda.</p> : (
          <ul className="divide-y divide-le-line/60">
            {replies.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p><Link href={`/admin/whatsapp/${d.lead.id}`} className="font-medium text-le-ink hover:text-le-blue">{d.lead.name}</Link> <span className="text-xs text-le-muted">· {d.campaign?.name} · {timeAgo(d.repliedAt, now)}</span></p>
                  {d.reply && <p className="mt-1 line-clamp-2 text-sm">{d.reply}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {awaitingReply(d.lead) ? <Chip tone="warn">Sem resposta sua</Chip> : <Chip tone="success">Você respondeu</Chip>}
                  <a href={whatsappLink(d.lead.phone)} target="_blank" rel="noreferrer" className={buttonVariants({ variant: 'outline', size: 'sm' })}>Abrir</a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
