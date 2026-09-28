// Leva o endereço livre antigo (address/city/state/zip) para CustomerAddress PRINCIPAL.
//   npx tsx scripts/migrate-customer-addresses.ts           → só relatório
//   npx tsx scripts/migrate-customer-addresses.ts --apply   → grava
// Não inventa dado: o texto livre vai inteiro para "logradouro"; número e bairro
// ficam vazios e aparecem como pendência fiscal até alguém revisar o cadastro.
import 'dotenv/config';
import { prisma } from '@/lib/db';
import { isBrState, matchMunicipality } from '@/lib/domains/customers/municipalities';
import { normalizePostalCode } from '@/lib/domains/customers/fiscal-readiness';

const apply = process.argv.includes('--apply');

async function main() {
  const customers = await prisma.customer.findMany({
    where: { addresses: { none: { kind: 'PRINCIPAL' } }, OR: [{ address: { not: null } }, { city: { not: null } }, { state: { not: null } }, { zip: { not: null } }] },
    select: { id: true, code: true, name: true, address: true, city: true, state: true, zip: true },
    orderBy: { code: 'asc' },
  });
  let matched = 0;
  const unresolved: string[] = [];
  const plans = [];
  for (const c of customers) {
    const uf = c.state?.trim().toUpperCase() ?? '';
    const cep = c.zip ? normalizePostalCode(c.zip) : '';
    const municipality = isBrState(uf) && c.city ? await matchMunicipality(uf, c.city) : null;
    if (municipality) matched++;
    else if (c.city || c.state) unresolved.push(`  ${c.code}  ${c.name}  cidade="${c.city ?? ''}" UF="${c.state ?? ''}"`);
    plans.push({
      customerId: c.id,
      kind: 'PRINCIPAL' as const,
      postalCode: cep.length === 8 ? cep : null,
      street: c.address?.trim() || null,
      cityName: municipality?.name ?? c.city?.trim() ?? null,
      state: municipality?.state ?? (isBrState(uf) ? uf : null),
      municipalityCode: municipality?.ibgeCode ?? null,
    });
  }
  console.log(`${customers.length} cliente(s) com endereço antigo · ${matched} com município IBGE identificado · ${unresolved.length} sem correspondência`);
  if (unresolved.length) console.log(`\nMunicípio não identificado (corrigir no cadastro):\n${unresolved.join('\n')}`);
  if (!apply) {
    if (plans.length) console.log(`\nSimulação. Rode com --apply para criar ${plans.length} endereço(s).`);
    return;
  }
  const { count } = await prisma.customerAddress.createMany({ data: plans, skipDuplicates: true });
  console.log(`\n✓ ${count} endereço(s) criado(s). Número e bairro ficam como pendência para revisão.`);
}

main()
  .catch((e) => {
    console.error('✗', e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
