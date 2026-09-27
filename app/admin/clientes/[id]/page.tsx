import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { buttonVariants } from '@/components/ui/button';
import { CustomerForm } from '@/components/admin/CustomerForm';
import { updateCustomer } from '../_actions';

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await prisma.customer.findUnique({ where: { id } });
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
      <CustomerForm
        action={updateWithId}
        submitLabel="Salvar alterações"
        defaultValues={{
          name: c.name, doc: c.doc ?? '', email: c.email ?? '', phone: c.phone ?? '',
          address: c.address ?? '', city: c.city ?? '', state: c.state ?? '', zip: c.zip ?? '', contact: c.contact ?? '',
        }}
      />
    </div>
  );
}
