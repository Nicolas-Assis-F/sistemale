// Importa a leitura das conversas do WhatsApp para o painel /admin/whatsapp.
// Uso: npm run crm:import -- data/crm/leads.json
// Para gravar em produção: CRM_ENV=.env.vercel npm run crm:import -- data/crm/leads.json
import { config } from 'dotenv';
// override: o @prisma/client já carregou o .env (banco local) ao ser importado.
if (process.env.CRM_ENV) config({ path: process.env.CRM_ENV, quiet: true, override: true });
config({ path: '.env.local', quiet: true });
config({ path: '.env', quiet: true });
import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { importLeads, type LeadImport } from '../lib/leads/service';

const file = process.argv[2] ?? 'data/crm/leads.json';
const prisma = new PrismaClient();
console.log(`→ Banco: ${new URL(process.env.DATABASE_URL ?? 'postgres://?').hostname || '(sem DATABASE_URL)'}`);
const leads = JSON.parse(readFileSync(file, 'utf8')) as LeadImport[];
importLeads(prisma, leads)
  .then((r) => console.log(`${leads.length} contatos lidos: ${r.created} novos, ${r.updated} atualizados`))
  .finally(() => prisma.$disconnect());
