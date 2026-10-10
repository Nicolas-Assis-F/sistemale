// Atualiza "aguardando resposta" e o status dos disparos a partir da bridge local.
// Uso: npm run crm:sync   (lê ~/whatsapp-mcp/whatsapp-bridge/store; nada é enviado)
// Para gravar em produção: CRM_ENV=.env.vercel npm run crm:sync
import { config } from 'dotenv';
// override: o @prisma/client já carregou o .env (banco local) ao ser importado.
if (process.env.CRM_ENV) config({ path: process.env.CRM_ENV, quiet: true, override: true });
config({ path: '.env.local', quiet: true });
config({ path: '.env', quiet: true });
import { execFileSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { syncActivity, type ChatActivity } from '../lib/leads/service';

const args = ['scripts/whatsapp/activity.py', ...(process.env.WHATSAPP_STORE ? [process.env.WHATSAPP_STORE] : [])];
const raw = execFileSync('python3', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const { generatedAt, chats } = JSON.parse(raw) as { generatedAt: string; chats: ChatActivity[] };
const prisma = new PrismaClient();
console.log(`→ Banco: ${new URL(process.env.DATABASE_URL ?? 'postgres://?').hostname || '(sem DATABASE_URL)'}`);
syncActivity(prisma, chats)
  .then((r) => console.log(`WhatsApp lido em ${generatedAt}: ${r.touched} contatos atualizados, ${r.sent} disparo(s) enviados, ${r.replied} resposta(s) nova(s)`))
  .finally(() => prisma.$disconnect());
