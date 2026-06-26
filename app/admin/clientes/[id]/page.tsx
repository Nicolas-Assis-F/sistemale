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
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/clientes" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>← Voltar</Link>
        <div>
          <h1 className="text-2xl font-bold">Editar Cliente</h1>
          <p className="font-mono text-xs text-muted-foreground">{c.code}</p>
        </div>
      </div>
      <CustomerForm
        action={updateWithId}
        submitLabel="Salvar Alterações"
        defaultValues={{
          name: c.name, doc: c.doc ?? '', email: c.email ?? '', phone: c.phone ?? '',
          address: c.address ?? '', city: c.city ?? '', state: c.state ?? '', zip: c.zip ?? '', contact: c.contact ?? '',
        }}
      />
    </div>
  );
}
