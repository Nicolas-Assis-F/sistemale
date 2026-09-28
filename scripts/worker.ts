// Worker de longa duração (opcional): para hospedagem com processo contínuo
// (VPS, Railway, Fly…). Na Vercel, after() + /api/cron/jobs cumprem esse papel.
//   npm run worker
import 'dotenv/config';
import { runJobs } from '@/lib/infrastructure/jobs/runner';
import { jobHandlers } from '@/lib/infrastructure/jobs/handlers';
import { newWorkerId } from '@/lib/infrastructure/jobs/queue';
import { prisma } from '@/lib/db';

const IDLE_MS = 5_000;
const workerId = newWorkerId();
let stopping = false;

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    console.log(`[worker ${workerId}] ${signal}: terminando o lote atual…`);
    stopping = true;
  });
}

console.log(`[worker ${workerId}] iniciado; tipos: ${Object.keys(jobHandlers).join(', ')}`);
while (!stopping) {
  try {
    const s = await runJobs(jobHandlers, { workerId, budgetMs: 60_000 });
    if (s.done + s.retry + s.dead) console.log(`[worker ${workerId}]`, s);
    else await new Promise((r) => setTimeout(r, IDLE_MS));
  } catch (error) {
    console.error(`[worker ${workerId}] erro ao consultar a fila`, error instanceof Error ? error.message : error);
    await new Promise((r) => setTimeout(r, IDLE_MS * 3));
  }
}
await prisma.$disconnect();
