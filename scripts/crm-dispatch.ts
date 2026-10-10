// Envia a fila de uma campanha pelo WhatsApp do PC (bridge local), devagar para não parecer robô.
// Uso: CRM_ENV=.env.vercel npm run crm:dispatch -- <id-da-campanha> [--teste] [--por-dia 100]
//   --teste      mostra o que sairia, sem enviar nem gravar nada
//   --por-dia N  teto de mensagens no dia, somando todas as campanhas (padrão 100)
// Ctrl+C para: termina a mensagem atual e sai. Rodar de novo continua de onde parou.
import { config } from 'dotenv';
// override: o @prisma/client já carregou o .env (banco local) ao ser importado.
if (process.env.CRM_ENV) config({ path: process.env.CRM_ENV, quiet: true, override: true });
config({ path: '.env.local', quiet: true });
config({ path: '.env', quiet: true });
import { PrismaClient } from '@prisma/client';

const BRIDGE = process.env.WHATSAPP_BRIDGE_URL ?? 'http://localhost:8080';
const GAP_S = [50, 60];          // entre mensagens
const BREAK_EVERY = 10;          // a cada N envios...
const BREAK_S = [180, 300];      // ...uma pausa maior
const HOURS = [8, 19];           // só envia nesse horário (Brasília)
const RECENT_TALK_DAYS = 2;      // quem você atendeu há pouco não recebe promoção
const MAX_FAILS = 3;             // erros seguidos da bridge antes de parar

const args = process.argv.slice(2);
const campaignId = args.find((a) => !a.startsWith('--'));
const dryRun = args.includes('--teste');
const perDayArg = args.indexOf('--por-dia');
const perDay = perDayArg >= 0 ? Math.max(1, Number(args[perDayArg + 1]) || 100) : 100;
if (!campaignId) {
  console.error('Informe o id da campanha: npm run crm:dispatch -- <id> (está na página da campanha)');
  process.exit(1);
}

const prisma = new PrismaClient();
let stopping = false;
process.on('SIGINT', () => {
  if (stopping) process.exit(130);
  stopping = true;
  console.log('\nParando depois desta mensagem… (Ctrl+C de novo sai na hora)');
});

const rand = ([a, b]: number[]) => a + Math.random() * (b - a);
const clock = () => new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });
const hourNow = () => Number(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hourCycle: 'h23' }));
const startOfToday = () => new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }) + 'T00:00:00-03:00');
async function wait(seconds: number) {
  const until = Date.now() + seconds * 1000;
  while (!stopping && Date.now() < until) await new Promise((r) => setTimeout(r, 500));
}

async function send(phone: string, message: string): Promise<string | null> {
  try {
    const res = await fetch(`${BRIDGE}/api/send`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: phone, message }),
    });
    const body = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string };
    return res.ok && body.success ? null : body.message || `HTTP ${res.status}`;
  } catch (e) {
    return `bridge fora do ar em ${BRIDGE} (${(e as Error).message})`;
  }
}

async function main() {
  console.log(`→ Banco: ${new URL(process.env.DATABASE_URL ?? 'postgres://?').hostname || '(sem DATABASE_URL)'}`);
  const campaign = await prisma.leadCampaign.findUnique({ where: { id: campaignId }, select: { name: true } });
  if (!campaign) throw new Error(`Campanha ${campaignId} não encontrada neste banco`);
  const pending = await prisma.leadDispatch.count({ where: { campaignId, status: 'PENDENTE' } });
  console.log(`Campanha "${campaign.name}": ${pending} na fila${dryRun ? ' (TESTE: nada será enviado)' : ''}`);

  let sentNow = 0;
  let fails = 0;
  const skippedInTest = new Set<string>();
  while (!stopping) {
    if (!dryRun) {
      const h = hourNow();
      if (h < HOURS[0] || h >= HOURS[1]) { console.log(`${clock()} fora do horário (${HOURS[0]}h–${HOURS[1]}h). Rode de novo amanhã.`); break; }
      const today = await prisma.leadDispatch.count({ where: { sentAt: { gte: startOfToday() } } });
      if (today >= perDay) { console.log(`${clock()} limite do dia atingido (${today}/${perDay}). Rode de novo amanhã.`); break; }
    } else if (sentNow >= perDay) break;

    const d = await prisma.leadDispatch.findFirst({
      where: { campaignId, status: 'PENDENTE', id: { notIn: [...skippedInTest] } },
      orderBy: { createdAt: 'asc' },
      include: { lead: { select: { name: true, phone: true, lastOutboundAt: true } } },
    });
    if (!d) { console.log('Fila vazia: campanha concluída.'); break; }

    const recent = d.lead.lastOutboundAt && Date.now() - d.lead.lastOutboundAt.getTime() < RECENT_TALK_DAYS * 86_400_000;
    if (recent || !/^\d{12,13}$/.test(d.lead.phone)) {
      console.log(`${clock()} pulando ${d.lead.name}: ${recent ? 'você falou com o contato há menos de 2 dias' : 'telefone inválido'}`);
      if (dryRun) skippedInTest.add(d.id);
      else await prisma.leadDispatch.update({ where: { id: d.id }, data: { status: 'PULADO' } });
      continue;
    }

    if (dryRun) {
      console.log(`\n[${sentNow + 1}] ${d.lead.name} (${d.lead.phone})\n${d.message}`);
      skippedInTest.add(d.id);
      sentNow++;
      continue;
    }

    const error = await send(d.lead.phone, d.message);
    if (error) {
      fails++;
      console.log(`${clock()} ✗ ${d.lead.name}: ${error}`);
      if (fails >= MAX_FAILS) { console.log(`${MAX_FAILS} erros seguidos: parei. Confira se a bridge está rodando e conectada.`); break; }
      await wait(rand(GAP_S));
      continue;
    }
    fails = 0;
    sentNow++;
    await prisma.leadDispatch.update({ where: { id: d.id }, data: { status: 'ENVIADO', sentAt: new Date() } });
    console.log(`${clock()} ✓ ${sentNow} · ${d.lead.name}`);

    const pause = sentNow % BREAK_EVERY === 0 ? rand(BREAK_S) : rand(GAP_S);
    if (sentNow % BREAK_EVERY === 0) console.log(`${clock()} pausa de ${Math.round(pause / 60)} min`);
    await wait(pause);
  }
  console.log(`${dryRun ? 'Sairiam' : 'Enviadas'} ${sentNow} mensagem(ns) nesta rodada.`);
}

main()
  .catch((e) => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
