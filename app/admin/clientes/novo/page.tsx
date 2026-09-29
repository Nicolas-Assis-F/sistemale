import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { CustomerForm } from '@/components/admin/CustomerForm';
import { createCustomer } from '../_actions';
import { requireAdmin } from '@/lib/auth';

export default async function NewCustomerPage() {
  await requireAdmin(); // não depende só do proxy (defesa em profundidade)
  return (
    <div className="le-admin-page">
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/admin/clientes" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>← Voltar</Link>
        <p className="le-kicker">Gestão / Clientes</p><h1 className="le-admin-title">Novo cliente</h1>
      </div>
      <CustomerForm action={createCustomer} submitLabel="Criar Cliente" />
    </div>
  );
}
