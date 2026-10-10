import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { buttonVariants } from '@/components/ui/button';
import { Panel } from '@/components/admin/production/ProductionNav';
import { Chip, LeadsNav, TemperatureBadge, timeAgo } from '@/components/admin/leads/LeadsNav';
import { ConfirmSubmit, OpenAndMark } from '@/components/admin/leads/DispatchButtons';
import { formatPhone, whatsappLink } from '@/lib/leads/rules';
import { deleteCampaign, markDispatchSent, setDispatchStatus } from '../../_actions';

export default async function CampaignPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; erro?: string }> }) {
  await requireAdmin();
  const [{ id }, flash] = await Promise.all([params, searchParams]);
  const campaign = await prisma.leadCampaign.findUnique({
    where: { id },
    include: { dispatches: { orderBy: { createdAt: 'asc' }, include: { lead: { select: { id: true, name: true, phone: true, temperature: true, isCustomer: true, equipment: true } } } } },
  });
  if (!campaign) notFound();
  const now = Date.now();
  const by = (s: string) => campaign.dispatches.filter((d) => d.status === s);
  const [pending, sent, replied, skipped] = [by('PENDENTE'), by('ENVIADO'), by('RESPONDEU'), by('PULADO')];

  return (
    <div className="le-admin-page">
      <LeadsNav active="/admin/whatsapp/disparos" title={campaign.name} flash={flash}
        description={`${pending.length} na fila · ${sent.length + replied.length} enviadas · ${replied.length} responderam · ${skipped.length} puladas. “Abrir e enviar” abre o WhatsApp com o texto pronto; confira e aperte enviar.`}>
        <div className="flex gap-2">
          <Link href="/admin/whatsapp/disparos" className={buttonVariants({ variant: 'outline' })}>Voltar</Link>
          <form action={deleteCampaign.bind(null, campaign.id)}><ConfirmSubmit message={`Excluir a campanha "${campaign.name}" e o histórico dela?`}>Excluir</ConfirmSubmit></form>
        </div>
      </LeadsNav>

      <Panel title={`Na fila (${pending.length})`}>
        {pending.length === 0 ? <p className="text-sm text-le-muted">Fila concluída.</p> : (
          <ul className="divide-y divide-le-line/60">
            {pending.map((d) => (
              <li key={d.id} className="grid gap-3 py-3 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><Link href={`/admin/whatsapp/${d.lead.id}`} className="font-medium text-le-ink hover:text-le-blue">{d.lead.name}</Link><TemperatureBadge value={d.lead.temperature} />{d.lead.isCustomer && <Chip tone="success">Cliente</Chip>}</div>
                  <p className="text-xs text-le-muted">{formatPhone(d.lead.phone)}</p>
                </div>
                <p className="rounded-xl bg-le-tint p-3 text-sm">{d.message}</p>
                <div className="flex gap-2 lg:justify-end">
                  <OpenAndMark href={whatsappLink(d.lead.phone, d.message)} onSent={markDispatchSent.bind(null, d.id)} />
                  <form action={setDispatchStatus.bind(null, campaign.id, d.id, 'PULADO')}><button className={buttonVariants({ variant: 'outline', size: 'sm' })}>Pular</button></form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={`Responderam (${replied.length})`}>
          {replied.length === 0 ? <p className="text-sm text-le-muted">Ainda ninguém. Rode npm run crm:sync para buscar as respostas.</p> : (
            <ul className="divide-y divide-le-line/60 text-sm">
              {replied.map((d) => (
                <li key={d.id} className="py-2.5">
                  <div className="flex items-center justify-between gap-2"><Link href={`/admin/whatsapp/${d.lead.id}`} className="font-medium text-le-ink hover:text-le-blue">{d.lead.name}</Link><span className="text-xs text-le-muted">{timeAgo(d.repliedAt, now)}</span></div>
                  {d.reply && <p className="mt-1 rounded-lg bg-le-success-surface p-2 text-xs">{d.reply}</p>}
                  <a href={whatsappLink(d.lead.phone)} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-le-blue underline">Continuar conversa</a>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title={`Enviadas sem resposta (${sent.length})`}>
          {sent.length === 0 ? <p className="text-sm text-le-muted">—</p> : (
            <ul className="divide-y divide-le-line/60 text-sm">
              {sent.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2 py-2.5">
                  <div><Link href={`/admin/whatsapp/${d.lead.id}`} className="font-medium text-le-ink hover:text-le-blue">{d.lead.name}</Link><p className="text-xs text-le-muted">enviado {timeAgo(d.sentAt, now)}</p></div>
                  <div className="flex gap-1">
                    <form action={setDispatchStatus.bind(null, campaign.id, d.id, 'RESPONDEU')}><button className={buttonVariants({ variant: 'outline', size: 'xs' })}>Respondeu</button></form>
                    <form action={setDispatchStatus.bind(null, campaign.id, d.id, 'PENDENTE')}><button className={buttonVariants({ variant: 'ghost', size: 'xs' })}>Não enviei</button></form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
