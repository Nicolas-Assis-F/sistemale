import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Field, Panel, fieldClass } from '@/components/admin/production/ProductionNav';
import { SubmitButton } from '@/components/admin/production/SubmitButton';
import { LeadsNav, formatDay } from '@/components/admin/leads/LeadsNav';
import { TemplateFields } from '@/components/admin/leads/DispatchButtons';
import { createCampaign } from '../_actions';

export default async function CampaignsPage({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  await requireAdmin();
  const flash = await searchParams;
  const campaigns = await prisma.leadCampaign.findMany({ orderBy: { createdAt: 'desc' }, include: { dispatches: { select: { status: true } } } });
  const today = new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }) + 'T00:00:00-03:00');
  const sentToday = await prisma.leadDispatch.count({ where: { sentAt: { gte: today } } });

  return (
    <div className="le-admin-page">
      <LeadsNav active="/admin/whatsapp/disparos" title="Disparos" flash={flash}
        description="Monte a fila por produto e nível de interesse. Cada mensagem abre no seu WhatsApp já escrita e você aperta enviar: nada sai sozinho, então o número não corre risco de bloqueio. As respostas aparecem aqui depois do npm run crm:sync." />

      <Panel title="Nova campanha" hint={`Enviados hoje: ${sentToday}. Mantenha até 30–40 mensagens novas por dia e personalize as dos clientes que já compraram.`}>
        <form action={createCampaign} className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome da campanha"><input name="name" required className={fieldClass} placeholder="Haste 2 7/8 — outubro" /></Field>
          <TemplateFields />
          <fieldset className="sm:col-span-2">
            <legend className="text-xs font-medium text-le-muted">Nível de interesse</legend>
            <div className="mt-2 flex flex-wrap gap-3 text-sm">
              {[['QUENTE', 'Quente'], ['MORNO', 'Morno'], ['FRIO', 'Frio'], ['SEM', 'Sem classificação (nunca conversou)']].map(([v, l]) => (
                <label key={v} className="inline-flex items-center gap-2"><input type="checkbox" name="temperatures" value={v} defaultChecked={v !== 'SEM'} className="size-4 accent-le-blue" />{l}</label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-wrap gap-4 text-sm sm:col-span-2">
            <label className="inline-flex items-center gap-2"><input type="checkbox" name="includeCustomers" className="size-4 accent-le-blue" /> Incluir quem já comprou</label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" name="onlyUnsaved" className="size-4 accent-le-blue" /> Só contatos não salvos</label>
          </div>
          <Field label="Não repetir quem recebeu disparo nos últimos (dias)"><input name="cooldownDays" type="number" min={0} max={365} defaultValue={14} className={fieldClass} /></Field>
          <Field label="Máximo de contatos na fila"><input name="limit" type="number" min={1} max={200} defaultValue={30} className={fieldClass} /></Field>
          <SubmitButton className="sm:col-span-2">Montar fila</SubmitButton>
        </form>
      </Panel>

      <Panel title="Campanhas">
        {campaigns.length === 0 ? <p className="text-sm text-le-muted">Nenhuma campanha ainda.</p> : (
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-140 text-sm">
              <thead><tr className="border-b border-le-line text-left text-xs text-le-muted">
                <th className="py-2 pr-3 font-medium">Campanha</th><th className="px-2 font-medium">Criada</th>
                <th className="px-2 text-right font-medium">Na fila</th><th className="px-2 text-right font-medium">Enviadas</th>
                <th className="px-2 text-right font-medium">Responderam</th><th className="px-2 text-right font-medium">Taxa</th>
              </tr></thead>
              <tbody>
                {campaigns.map((c) => {
                  const n = (s: string) => c.dispatches.filter((d) => d.status === s).length;
                  const sent = n('ENVIADO') + n('RESPONDEU');
                  return (
                    <tr key={c.id} className="border-b border-le-line/60 last:border-0">
                      <td className="py-2.5 pr-3"><Link href={`/admin/whatsapp/disparos/${c.id}`} className="font-medium text-le-ink hover:text-le-blue">{c.name}</Link></td>
                      <td className="px-2 text-le-muted">{formatDay(c.createdAt)}</td>
                      <td className="px-2 text-right tabular-nums">{n('PENDENTE')}</td>
                      <td className="px-2 text-right tabular-nums">{sent}</td>
                      <td className="px-2 text-right tabular-nums font-semibold text-le-success">{n('RESPONDEU')}</td>
                      <td className="px-2 text-right tabular-nums">{sent ? `${Math.round((n('RESPONDEU') / sent) * 100)}%` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
