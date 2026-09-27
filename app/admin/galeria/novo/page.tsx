import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { GalleryItemForm } from '@/components/admin/GalleryItemForm';
import { createGalleryItem } from '../_actions';

export default function NewGalleryItemPage() {
  return (
    <div className="le-admin-page">
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/admin/galeria" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>← Voltar</Link>
        <p className="le-kicker">Gestão / Galeria</p><h1 className="le-admin-title">Nova foto</h1>
      </div>
      <GalleryItemForm action={createGalleryItem} submitLabel="Adicionar à Galeria" />
    </div>
  );
}
