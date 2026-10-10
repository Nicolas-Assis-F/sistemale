import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MessageCircle, Trash2 } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { Field, Panel, fieldClass } from '@/components/admin/production/ProductionNav';
import { SubmitButton } from '@/components/admin/production/SubmitButton';
import { Chip, LeadsNav, TemperatureBadge, formatDay, timeAgo } from '@/components/admin/leads/LeadsNav';
import {
  KIND_LABELS, SEGMENT_CODES, STAGE_LABELS, TEMPERATURE_LABELS, awaitingReply, formatPhone, segmentLabel, whatsappLink,
} from '@/lib/leads/rules';
import { addPurchase, addReceivable, deletePurchase, deleteReceivable, toggleReceivablePaid, updateLead } from '../_actions';

const DISPATCH_LABELS = { PENDENTE: 'Na fila', ENVIADO: 'Enviado', RESPONDEU: 'Respondeu', PULADO: 'Pulado' } as const;

export default async function LeadPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; erro?: string }> }) {
  await requireAdmin();
  const [{ id }, flash] = await Promise.all([params, searchParams]);
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      purchases: { orderBy: { date: { sort: 'desc', nulls: 'last' } } },
      receivables: { orderBy: [{ paidAt: { sort: 'asc', nulls: 'first' } }, { dueDate: { sort: 'asc', nulls: 'last' } }] },
      dispatches: { orderBy: { createdAt: 'desc' }, take: 20, include: { campaign: { select: { id: true, name: true } } } },
    },
  });
  if (!lead) notFound();
  const open = lead.receivables.filter((r) => !r.paidAt);
  const owed = open.reduce((s, r) => s + r.amountCents, 0);
  const now = Date.now();
  const waiting = awaitingReply(lead);
  const bought = lead.purchases.reduce((s, p) => s + (p.amountCents ?? 0), 0);

  return (
    <div className="le-admin-page">
      <LeadsNav active={null} flash={flash}
        title={<span className="flex flex-wrap items-center gap-3">{lead.name} <TemperatureBadge value={lead.temperature} /></span>}
        description={<>
          {formatPhone(lead.phone)}{lead.city ? ` · ${lead.city}` : ''}
          {lead.savedName ? ` · salvo como “${lead.savedName}”` : ' · não está salvo na agenda'}
          {lead.pushName && lead.pushName !== lead.name ? ` · perfil “${lead.pushName}”` : ''}
        </>}>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/whatsapp" className={buttonVariants({ variant: 'outline' })}>Voltar</Link>
          {!lead.savedName && <a href={`/admin/whatsapp/agenda.vcf?id=${lead.id}`} className={buttonVariants({ variant: 'outline' })}>Salvar na agenda</a>}
          <a href={whatsappLink(lead.phone)} target="_blank" rel="noreferrer" className={buttonVariants()}><MessageCircle className="size-4" /> Abrir conversa</a>
        </div>
      </LeadsNav>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Situação', value: lead.isCustomer ? 'Cliente' : KIND_LABELS[lead.kind ?? ''] ?? 'Contato', detail: lead.stage ? STAGE_LABELS[lead.stage] ?? lead.stage : '—' },
          { label: 'Comprou', value: bought ? formatCurrency(bought) : lead.purchases.length ? `${lead.purchases.length} compra(s)` : '—', detail: lead.purchases[0]?.date ? `Última em ${formatDay(lead.purchases[0].date)}` : 'Sem compra registrada' },
          { label: 'A receber', value: owed ? formatCurrency(owed) : '—', detail: open.length ? `${open.length} parcela(s) em aberto` : lead.balanceNote ? 'Ver nota de saldo abaixo' : 'Nada em aberto', danger: owed > 0 },
          { label: 'Última conversa', value: timeAgo(lead.lastMessageAt, now), detail: waiting ? 'Ele falou por último: responda' : lead.lastMessageAt ? 'Você falou por último' : 'Sem atividade sincronizada', warn: waiting },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-le-line bg-white p-4">
            <p className="text-xs text-le-muted">{k.label}</p>
            <p className={cn('mt-2 font-heading text-xl font-medium tracking-[-.04em]', k.danger ? 'text-le-danger' : 'text-le-ink')}>{k.value}</p>
            <p className={cn('mt-1 text-[11px]', k.warn ? 'font-semibold text-le-warning' : 'text-le-muted')}>{k.detail}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Panel title="O que sabemos" hint="Lido das mensagens e dos áudios. A próxima importação atualiza este bloco; suas anotações ficam na ficha ao lado.">
            <dl className="grid gap-4 text-sm">
              <div><dt className="text-xs text-le-muted">Material que usa</dt><dd className="mt-1 font-medium text-le-ink">{lead.equipment || '—'}</dd></div>
              {lead.interests.length > 0 && <div><dt className="text-xs text-le-muted">Interesses</dt><dd className="mt-1 flex flex-wrap gap-1">{lead.interests.map((i) => <Chip key={i} tone="blue">{i}</Chip>)}</dd></div>}
              {lead.summary && <div><dt className="text-xs text-le-muted">Resumo</dt><dd className="mt-1 leading-relaxed">{lead.summary}</dd></div>}
              {lead.objections && <div><dt className="text-xs text-le-muted">Objeções</dt><dd className="mt-1">{lead.objections}</dd></div>}
              {lead.pendingOrder && <div className="rounded-xl bg-le-warning-surface p-3 text-le-warning"><dt className="text-xs font-semibold">Pedido pendente</dt><dd className="mt-1">{lead.pendingOrder}</dd></div>}
              {lead.balanceNote && <div className="rounded-xl bg-le-danger-surface p-3 text-le-danger"><dt className="text-xs font-semibold">Saldo segundo a conversa</dt><dd className="mt-1">{lead.balanceNote}</dd></div>}
              {lead.nextStep && <div><dt className="text-xs text-le-muted">Próximo passo</dt><dd className="mt-1 font-medium text-le-blue">{lead.nextStep}</dd></div>}
              {lead.lastMessage && <div><dt className="text-xs text-le-muted">Última mensagem ({timeAgo(lead.lastMessageAt, now)})</dt><dd className="mt-1 rounded-xl bg-le-tint p-3 text-le-text">{lead.lastMessage}</dd></div>}
            </dl>
          </Panel>

          <Panel title="Compras">
            {lead.purchases.length === 0 ? <p className="text-sm text-le-muted">Nenhuma compra registrada.</p> : (
              <ul className="divide-y divide-le-line/60 text-sm">
                {lead.purchases.map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="font-medium text-le-ink">{p.qty ? `${p.qty} × ` : ''}{p.item}</p>
                      <p className="text-xs text-le-muted">{formatDay(p.date)}{p.note ? ` · ${p.note}` : ''}{p.source === 'manual' ? ' · lançada à mão' : ''}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {p.amountCents != null && <span className="tabular-nums font-semibold">{formatCurrency(p.amountCents)}</span>}
                      <form action={deletePurchase.bind(null, lead.id, p.id)}><button aria-label="Remover compra" className="rounded-lg p-1.5 text-le-muted hover:bg-le-tint hover:text-le-danger"><Trash2 className="size-4" /></button></form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <form action={addPurchase.bind(null, lead.id)} className="mt-4 grid gap-3 border-t border-le-line pt-4 sm:grid-cols-2">
              <Field label="O que comprou"><input name="item" required className={fieldClass} placeholder='Haste 3 1/2" 2,20 m' /></Field>
              <Field label="Quantidade"><input name="qty" className={fieldClass} placeholder="40" /></Field>
              <Field label="Valor total (R$)"><input name="amount" inputMode="decimal" className={fieldClass} placeholder="34.000,00" /></Field>
              <Field label="Data"><input name="date" type="date" className={fieldClass} /></Field>
              <SubmitButton variant="outline" className="sm:col-span-2">Registrar compra</SubmitButton>
            </form>
          </Panel>

          <Panel title="Parcelas a receber" hint="Combinados pelo WhatsApp. Marque como paga quando o pix ou boleto cair.">
            {lead.receivables.length === 0 ? <p className="text-sm text-le-muted">Nenhuma parcela lançada.</p> : (
              <ul className="divide-y divide-le-line/60 text-sm">
                {lead.receivables.map((r) => {
                  const late = !r.paidAt && r.dueDate && r.dueDate.getTime() < now;
                  return (
                    <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className={cn('font-medium', r.paidAt ? 'text-le-muted line-through' : 'text-le-ink')}>{r.description}</p>
                        <p className={cn('text-xs', late ? 'font-semibold text-le-danger' : 'text-le-muted')}>
                          {r.paidAt ? `Paga em ${formatDay(r.paidAt)}` : r.dueDate ? `${late ? 'Venceu' : 'Vence'} em ${formatDay(r.dueDate)}` : 'Sem vencimento'}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="tabular-nums font-semibold">{formatCurrency(r.amountCents)}</span>
                        <form action={toggleReceivablePaid.bind(null, lead.id, r.id, undefined)}>
                          <button className={buttonVariants({ variant: r.paidAt ? 'outline' : 'primary', size: 'sm' })}>{r.paidAt ? 'Desfazer' : 'Recebi'}</button>
                        </form>
                        <form action={deleteReceivable.bind(null, lead.id, r.id)}><button aria-label="Remover parcela" className="rounded-lg p-1.5 text-le-muted hover:bg-le-tint hover:text-le-danger"><Trash2 className="size-4" /></button></form>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <form action={addReceivable.bind(null, lead.id)} className="mt-4 grid gap-3 border-t border-le-line pt-4 sm:grid-cols-2">
              <Field label="Descrição"><input name="description" required className={fieldClass} placeholder="Parcela das hastes" /></Field>
              <Field label="Valor de cada parcela (R$)"><input name="amount" required inputMode="decimal" className={fieldClass} placeholder="2.000,00" /></Field>
              <Field label="1º vencimento"><input name="dueDate" type="date" className={fieldClass} /></Field>
              <Field label="Quantas parcelas (mensais)"><input name="count" type="number" min={1} max={24} defaultValue={1} className={fieldClass} /></Field>
              <SubmitButton variant="outline" className="sm:col-span-2">Lançar parcela(s)</SubmitButton>
            </form>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Ficha">
            <form action={updateLead.bind(null, lead.id)} className="grid gap-3">
              <Field label="Nome"><input name="name" defaultValue={lead.name} required className={fieldClass} /></Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nível de interesse">
                  <select name="temperature" defaultValue={lead.temperature ?? ''} className={fieldClass}>
                    <option value="">Sem classificação</option>
                    {Object.entries(TEMPERATURE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </Field>
                <Field label="Etapa">
                  <select name="stage" defaultValue={lead.stage ?? ''} className={fieldClass}>
                    <option value="">—</option>
                    {Object.entries(STAGE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </Field>
                <Field label="Tipo">
                  <select name="kind" defaultValue={lead.kind ?? ''} className={fieldClass}>
                    <option value="">—</option>
                    {Object.entries(KIND_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </Field>
                <Field label="Cidade / UF"><input name="city" defaultValue={lead.city ?? ''} className={fieldClass} /></Field>
              </div>
              <Field label="Material que usa"><input name="equipment" defaultValue={lead.equipment ?? ''} className={fieldClass} placeholder='Haste 3 1/2" x 2,20 m, rosca IF' /></Field>
              <fieldset>
                <legend className="text-xs font-medium text-le-muted">Produtos de interesse (usados nos disparos)</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SEGMENT_CODES.map((s) => (
                    <label key={s} className="inline-flex items-center gap-1.5 rounded-full border border-le-line px-2.5 py-1 text-xs has-checked:border-le-blue has-checked:bg-le-blue-light has-checked:text-le-blue">
                      <input type="checkbox" name="segments" value={s} defaultChecked={lead.segments.includes(s)} className="accent-le-blue" />{segmentLabel(s)}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" name="isCustomer" defaultChecked={lead.isCustomer} className="size-4 accent-le-blue" /> Já é cliente (comprou)</label>
              <Field label="Próximo passo"><input name="nextStep" defaultValue={lead.nextStep ?? ''} className={fieldClass} /></Field>
              <Field label="Anotações"><textarea name="notes" defaultValue={lead.notes ?? ''} rows={4} className={cn(fieldClass, 'h-auto py-2')} placeholder="Só você vê. A importação não apaga." /></Field>
              <SubmitButton>Salvar ficha</SubmitButton>
            </form>
          </Panel>

          <Panel title="Disparos para este contato">
            {lead.dispatches.length === 0 ? <p className="text-sm text-le-muted">Nenhuma campanha enviada ainda.</p> : (
              <ul className="divide-y divide-le-line/60 text-sm">
                {lead.dispatches.map((d) => (
                  <li key={d.id} className="py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      {d.campaign ? <Link href={`/admin/whatsapp/disparos/${d.campaign.id}`} className="font-medium text-le-ink hover:text-le-blue">{d.campaign.name}</Link> : <span>Mensagem avulsa</span>}
                      <Chip tone={d.status === 'RESPONDEU' ? 'success' : d.status === 'ENVIADO' ? 'blue' : 'muted'}>{DISPATCH_LABELS[d.status]}</Chip>
                    </div>
                    <p className="mt-1 text-xs text-le-muted">{d.sentAt ? `Enviado ${timeAgo(d.sentAt, now)}` : `Criado ${timeAgo(d.createdAt, now)}`}{d.repliedAt ? ` · respondeu ${timeAgo(d.repliedAt, now)}` : ''}</p>
                    {d.reply && <p className="mt-1 rounded-lg bg-le-success-surface p-2 text-xs">{d.reply}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
