import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { buttonVariants } from '@/components/ui/button';
import { ServiceItemForm } from '@/components/admin/ServiceItemForm';
import { updateService } from '../_actions';

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const service = await prisma.serviceItem.findUnique({ where: { id } });
  if (!service) notFound();

  const updateWithId = updateService.bind(null, id);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/servicos" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>← Voltar</Link>
        <h1 className="text-2xl font-bold">Editar Serviço</h1>
      </div>
      <ServiceItemForm
        action={updateWithId}
        submitLabel="Salvar Alterações"
        defaultValues={{
          title: service.title,
          description: service.description,
          icon: service.icon ?? '',
          order: service.order,
          active: service.active,
        }}
      />
    </div>
  );
}
