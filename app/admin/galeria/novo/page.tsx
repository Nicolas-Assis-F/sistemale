import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { GalleryItemForm } from '@/components/admin/GalleryItemForm';
import { createGalleryItem } from '../_actions';

export default function NewGalleryItemPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/galeria" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>← Voltar</Link>
        <h1 className="text-2xl font-bold">Nova Foto</h1>
      </div>
      <GalleryItemForm action={createGalleryItem} submitLabel="Adicionar à Galeria" />
    </div>
  );
}
