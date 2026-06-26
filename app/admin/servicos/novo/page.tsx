import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { ServiceItemForm } from '@/components/admin/ServiceItemForm';
import { createService } from '../_actions';

export default function NewServicePage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/servicos" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>← Voltar</Link>
        <h1 className="text-2xl font-bold">Novo Serviço</h1>
      </div>
      <ServiceItemForm action={createService} submitLabel="Criar Serviço" />
    </div>
  );
}
