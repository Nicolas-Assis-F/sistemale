// Saneamento dos CPF/CNPJ já cadastrados (Fase 2 do plano).
//   npx tsx scripts/normalize-customer-docs.ts           → só relatório, não grava
//   npx tsx scripts/normalize-customer-docs.ts --apply   → grava a forma canônica dos válidos
// Documento inválido NUNCA é alterado nem apagado: aparece no relatório para correção manual.
import 'dotenv/config';
import { prisma } from '@/lib/db';
import { parseTaxId } from '@/lib/domains/customers/tax-id';

const apply = process.argv.includes('--apply');

async function main() {
  const customers = await prisma.customer.findMany({
    where: { doc: { not: null } },
    select: { id: true, code: true, name: true, doc: true, asaasCustomerId: true },
    orderBy: { code: 'asc' },
  });
  const toFix: { id: string; from: string; to: string }[] = [];
  const invalid: { code: string; name: string; doc: string; reason: string }[] = [];
  const seen = new Map<string, string>();
  const duplicates: string[] = [];

  for (const c of customers) {
    const doc = c.doc!;
    if (!doc.trim()) continue;
    const r = parseTaxId(doc);
    if (!r.ok) {
      invalid.push({ code: c.code, name: c.name, doc, reason: r.reason });
      continue;
    }
    if (seen.has(r.value)) duplicates.push(`${r.value}: ${seen.get(r.value)} e ${c.code}`);
    else seen.set(r.value, c.code);
    if (r.value !== doc) toFix.push({ id: c.id, from: doc, to: r.value });
  }

  console.log(`${customers.length} clientes com documento · ${toFix.length} a normalizar · ${invalid.length} inválidos · ${duplicates.length} duplicados`);
  if (invalid.length) {
    console.log('\nInválidos (corrigir no cadastro):');
    for (const i of invalid) console.log(`  ${i.code}  ${i.name}  "${i.doc}"  → ${i.reason}`);
  }
  if (duplicates.length) {
    console.log('\nMesmo documento em mais de um cadastro (revisar/mesclar):');
    for (const d of duplicates) console.log(`  ${d}`);
  }
  if (!apply) {
    if (toFix.length) console.log(`\nSimulação. Rode com --apply para gravar ${toFix.length} documento(s) na forma canônica.`);
    return;
  }
  for (const f of toFix) await prisma.customer.update({ where: { id: f.id }, data: { doc: f.to } });
  console.log(`\n✓ ${toFix.length} documento(s) normalizado(s).`);
}

main()
  .catch((e) => {
    console.error('✗', e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
