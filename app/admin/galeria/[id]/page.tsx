import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { buttonVariants } from '@/components/ui/button';
import { GalleryItemForm } from '@/components/admin/GalleryItemForm';
import { updateGalleryItem } from '../_actions';
import { requireAdmin } from '@/lib/auth';

export default async function EditGalleryItemPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin(); // não depende só do proxy (defesa em profundidade)
  const { id } = await params;
  const item = await prisma.galleryItem.findUnique({ where: { id } });
  if (!item) notFound();

  const updateWithId = updateGalleryItem.bind(null, id);

  return (
    <div className="le-admin-page">
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/admin/galeria" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>← Voltar</Link>
        <p className="le-kicker">Gestão / Galeria</p><h1 className="le-admin-title">Editar foto</h1>
      </div>
      <GalleryItemForm
        action={updateWithId}
        submitLabel="Salvar alterações"
        defaultValues={{
          title: item.title,
          description: item.description ?? '',
          imageUrl: item.imageUrl,
          category: item.category ?? '',
          order: item.order,
          active: item.active,
        }}
      />
    </div>
  );
}
