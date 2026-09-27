import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { CustomerForm } from '@/components/admin/CustomerForm';
import { createCustomer } from '../_actions';

export default function NewCustomerPage() {
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
