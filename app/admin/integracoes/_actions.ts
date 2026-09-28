'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { retryDeadJob } from '@/lib/infrastructure/jobs/queue';
import { runJobs } from '@/lib/infrastructure/jobs/runner';
import { jobHandlers } from '@/lib/infrastructure/jobs/handlers';

type Result = { ok: true; message: string } | { error: string };

export async function retryJob(id: string): Promise<Result> {
  await requireAdmin();
  const { count } = await retryDeadJob(id);
  if (!count) return { error: 'O job não está mais parado — atualize a página.' };
  const s = await runJobs(jobHandlers, { budgetMs: 20_000 });
  revalidatePath('/admin/integracoes');
  revalidatePath('/admin', 'layout');
  return { ok: true, message: s.done ? 'Reprocessado com sucesso.' : 'Recolocado na fila; veja o erro abaixo se falhar de novo.' };
}

export async function runQueueNow(): Promise<Result> {
  await requireAdmin();
  const s = await runJobs(jobHandlers, { budgetMs: 20_000 });
  revalidatePath('/admin/integracoes');
  const total = s.done + s.retry + s.dead;
  return { ok: true, message: total ? `${s.done} concluído(s) · ${s.retry} para nova tentativa · ${s.dead} parado(s)` : 'Nada pendente na fila.' };
}
