// Carga/atualização do catálogo de municípios a partir da API pública do IBGE.
//   npm run db:municipios            (usa DATABASE_URL do .env)
// Idempotente: insere novos, atualiza nomes e marca como inativos os que saírem da lista.
import 'dotenv/config';
import { prisma } from '@/lib/db';
import { isBrState, municipalitySearchKey } from '@/lib/domains/customers/municipalities';

const SOURCE = 'https://servicodados.ibge.gov.br/api/v1/localidades/municipios?view=nivelado';

type IbgeRow = { 'municipio-id': number; 'municipio-nome': string; 'UF-sigla': string };

async function main() {
  const res = await fetch(SOURCE, { signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`IBGE respondeu ${res.status}`);
  const rows = (await res.json()) as IbgeRow[];

  const items = rows.map((r) => ({
    ibgeCode: String(r['municipio-id']),
    name: r['municipio-nome'].trim(),
    state: r['UF-sigla'],
  }));
  const invalid = items.filter((m) => !/^\d{7}$/.test(m.ibgeCode) || !isBrState(m.state) || !m.name);
  // Lista suspeita não mexe no catálogo: melhor falhar do que desativar municípios válidos
  if (invalid.length || items.length < 5000) {
    throw new Error(`lista do IBGE inesperada: ${items.length} itens, ${invalid.length} inválidos`);
  }

  const codes = items.map((m) => m.ibgeCode);
  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < items.length; i += 1000) {
      const chunk = items.slice(i, i + 1000);
      await tx.$executeRaw`
        INSERT INTO "Municipality" ("ibgeCode", "name", "state", "searchName", "active", "updatedAt")
        SELECT c, n, s, k, true, now() AT TIME ZONE 'UTC'
        FROM unnest(${chunk.map((m) => m.ibgeCode)}::text[], ${chunk.map((m) => m.name)}::text[],
                    ${chunk.map((m) => m.state)}::text[], ${chunk.map((m) => municipalitySearchKey(m.name))}::text[]) AS t(c, n, s, k)
        ON CONFLICT ("ibgeCode") DO UPDATE SET
          "name" = EXCLUDED."name", "state" = EXCLUDED."state", "searchName" = EXCLUDED."searchName",
          "active" = true, "updatedAt" = EXCLUDED."updatedAt"
        WHERE "Municipality"."name" IS DISTINCT FROM EXCLUDED."name"
           OR "Municipality"."state" IS DISTINCT FROM EXCLUDED."state"
           OR NOT "Municipality"."active"`;
    }
    const retired = await tx.municipality.updateMany({ where: { ibgeCode: { notIn: codes }, active: true }, data: { active: false } });
    console.log(`✓ ${items.length} municípios do IBGE; ${retired.count} marcados como inativos.`);
  }, { timeout: 120_000 });
}

main()
  .catch((e) => {
    console.error('✗', e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
