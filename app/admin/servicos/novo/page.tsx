import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { ServiceItemForm } from '@/components/admin/ServiceItemForm';
import { createService } from '../_actions';

export default function NewServicePage() {
  return (
    <div className="le-admin-page">
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/admin/servicos" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>← Voltar</Link>
        <p className="le-kicker">Gestão / Servicos</p><h1 className="le-admin-title">Novo serviço</h1>
      </div>
      <ServiceItemForm action={createService} submitLabel="Criar Serviço" />
    </div>
  );
}
