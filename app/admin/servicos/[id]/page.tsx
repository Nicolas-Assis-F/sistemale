import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { buttonVariants } from '@/components/ui/button';
import { ServiceItemForm } from '@/components/admin/ServiceItemForm';
import { updateService } from '../_actions';
import { requireAdmin } from '@/lib/auth';

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin(); // não depende só do proxy (defesa em profundidade)
  const { id } = await params;
  const service = await prisma.serviceItem.findUnique({ where: { id } });
  if (!service) notFound();

  const updateWithId = updateService.bind(null, id);

  return (
    <div className="le-admin-page">
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/admin/servicos" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>← Voltar</Link>
        <p className="le-kicker">Gestão / Servicos</p><h1 className="le-admin-title">Editar serviço</h1>
      </div>
      <ServiceItemForm
        action={updateWithId}
        submitLabel="Salvar alterações"
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
