import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { CustomerForm } from '@/components/admin/CustomerForm';
import { createCustomer } from '../_actions';

export default function NewCustomerPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/clientes" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>← Voltar</Link>
        <h1 className="text-2xl font-bold">Novo Cliente</h1>
      </div>
      <CustomerForm action={createCustomer} submitLabel="Criar Cliente" />
    </div>
  );
}
