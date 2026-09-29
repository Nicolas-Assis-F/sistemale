import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { defaultPricingProfile, priceInputs } from '@/lib/domains/costing/service';
import { CostingNav } from '@/components/admin/costing/CostingNav';
import { QuickQuote } from '@/components/admin/costing/QuickQuote';

export default async function QuickQuotePage() {
  await requireAdmin();
  const [materials, workCenters, profile] = await Promise.all([
    prisma.material.findMany({
      where: { active: true, kind: { in: ['BARRA_REDONDA', 'TUBO'] }, unit: { in: ['KG', 'M'] } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, kind: true, unit: true, unitCostCents: true, diameterMm: true, wallMm: true },
    }),
    prisma.workCenter.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true, rateCentsPerHour: true } }),
    defaultPricingProfile({ readOnly: true }),
  ]);
  return (
    <div className="le-admin-page">
      <CostingNav active="/admin/custos/cotacao" title="Cotação rápida por peso" description="Simule barras e tubos com os custos cadastrados. Nada é gravado. Processos e serviço avulso são valores do lote inteiro." />
      <QuickQuote materials={materials} workCenters={workCenters} pricing={priceInputs(profile)} />
    </div>
  );
}
