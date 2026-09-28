import { Workflow } from 'lucide-react';
import { prisma } from '@/lib/db';
import { JobActionButton } from '@/components/admin/JobActionButton';
import { retryJob, runQueueNow } from './_actions';

const JOB_LABELS: Record<string, string> = {
  'asaas.webhook': 'Webhook Asaas',
};

const INBOX_LABELS = { RECEIVED: 'Recebido', PROCESSED: 'Processado', IGNORED: 'Ignorado', FAILED: 'Com falha' } as const;

const fmt = (d: Date | null) => (d ? d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }) : '—');

export default async function IntegrationsPage() {
  const [byStatus, problems, inbox] = await Promise.all([
    prisma.job.groupBy({ by: ['status'], _count: true }),
    prisma.job.findMany({
      where: { OR: [{ status: 'DEAD' }, { status: 'PENDING', lastError: { not: null } }] },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    }),
    prisma.webhookInbox.findMany({
      orderBy: { receivedAt: 'desc' },
      take: 30,
      select: { id: true, provider: true, account: true, eventType: true, status: true, attempts: true, lastError: true, receivedAt: true, processedAt: true },
    }),
  ]);
  const count = (s: string) => byStatus.find((b) => b.status === s)?._count ?? 0;
  const stats = [
    { label: 'Na fila', value: count('PENDING'), tone: '' },
    { label: 'Executando', value: count('RUNNING'), tone: '' },
    { label: 'Parados (análise manual)', value: count('DEAD'), tone: count('DEAD') ? 'text-red-600' : '' },
    { label: 'Concluídos', value: count('DONE'), tone: '' },
  ];

  return (
    <div className="le-admin-page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="le-kicker">Sistema</p>
          <h1 className="le-admin-title">Integrações</h1>
          <p className="text-sm text-muted-foreground">
            Webhooks recebidos e tarefas em segundo plano. Falhas são tentadas de novo automaticamente;
            depois de 8 tentativas o job para e aparece aqui.
          </p>
        </div>
        <JobActionButton action={runQueueNow} label="Processar fila agora" kind="run" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`mt-1 font-heading text-2xl font-medium ${s.tone}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-medium">Precisam de atenção</h2>
        {problems.length ? (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            {problems.map((j) => (
              <li key={j.id} className="flex flex-wrap items-start gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {JOB_LABELS[j.type] ?? j.type}{' '}
                    <span className={`ml-1 rounded-md px-1.5 py-0.5 text-[11px] ${j.status === 'DEAD' ? 'bg-red-500/10 text-red-700' : 'bg-amber-500/10 text-amber-700'}`}>
                      {j.status === 'DEAD' ? 'Parado' : `Nova tentativa ${fmt(j.runAt)}`}
                    </span>
                  </p>
                  <p className="mt-1 break-words font-mono text-xs text-muted-foreground">{j.lastError}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Tentativas {j.attempts}/{j.maxAttempts} · atualizado {fmt(j.updatedAt)}</p>
                </div>
                {j.status === 'DEAD' && <JobActionButton action={retryJob.bind(null, j.id)} label="Tentar de novo" kind="retry" />}
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border border-dashed border-border py-10 text-center text-muted-foreground">
            <Workflow className="mx-auto mb-2 h-8 w-8 opacity-40" />
            <p className="text-sm">Nenhuma falha pendente.</p>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-medium">Últimos webhooks</h2>
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th className="p-3 font-medium">Recebido</th>
                <th className="p-3 font-medium">Origem</th>
                <th className="p-3 font-medium">Evento</th>
                <th className="p-3 font-medium">Situação</th>
                <th className="p-3 font-medium">Erro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {inbox.map((i) => (
                <tr key={i.id}>
                  <td className="whitespace-nowrap p-3">{fmt(i.receivedAt)}</td>
                  <td className="p-3">{i.provider} <span className="text-xs text-muted-foreground">({i.account})</span></td>
                  <td className="p-3 font-mono text-xs">{i.eventType}</td>
                  <td className="p-3">{INBOX_LABELS[i.status]}{i.attempts > 1 ? ` · ${i.attempts}×` : ''}</td>
                  <td className="max-w-80 truncate p-3 text-xs text-muted-foreground" title={i.lastError ?? undefined}>{i.lastError ?? '—'}</td>
                </tr>
              ))}
              {!inbox.length && (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Nenhum webhook recebido ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
