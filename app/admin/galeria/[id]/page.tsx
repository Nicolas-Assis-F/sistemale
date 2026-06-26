import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { buttonVariants } from '@/components/ui/button';
import { GalleryItemForm } from '@/components/admin/GalleryItemForm';
import { updateGalleryItem } from '../_actions';

export default async function EditGalleryItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await prisma.galleryItem.findUnique({ where: { id } });
  if (!item) notFound();

  const updateWithId = updateGalleryItem.bind(null, id);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/galeria" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>← Voltar</Link>
        <h1 className="text-2xl font-bold">Editar Foto</h1>
      </div>
      <GalleryItemForm
        action={updateWithId}
        submitLabel="Salvar Alterações"
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
