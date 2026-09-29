import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { buttonVariants } from '@/components/ui/button';
import { CustomerForm } from '@/components/admin/CustomerForm';
import { updateCustomer } from '../_actions';
import { formatTaxId } from '@/lib/domains/customers/tax-id';
import { customerFiscalReadiness, fiscalFormDefaults, principalAddressInclude } from '@/lib/domains/customers/fiscal-profile';
import { FiscalReadinessPanel } from '@/components/admin/FiscalReadinessPanel';
import { requireAdmin } from '@/lib/auth';

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin(); // não depende só do proxy (defesa em profundidade)
  const { id } = await params;
  const c = await prisma.customer.findUnique({ where: { id }, include: principalAddressInclude });
  if (!c) notFound();

  const updateWithId = updateCustomer.bind(null, id);

  return (
    <div className="le-admin-page">
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/admin/clientes" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>← Voltar</Link>
        <div>
          <p className="le-kicker">Gestão / Clientes</p><h1 className="le-admin-title">Editar cliente</h1>
          <p className="font-mono text-xs text-muted-foreground">{c.code}</p>
        </div>
      </div>
      <div className="max-w-2xl"><FiscalReadinessPanel readiness={customerFiscalReadiness(c)} /></div>
      <CustomerForm
        action={updateWithId}
        submitLabel="Salvar alterações"
        defaultValues={{
          name: c.name, doc: formatTaxId(c.doc ?? ''), email: c.email ?? '', phone: c.phone ?? '',
          contact: c.contact ?? '', ...fiscalFormDefaults(c),
        }}
      />
    </div>
  );
}
