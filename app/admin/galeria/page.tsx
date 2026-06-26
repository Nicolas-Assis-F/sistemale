import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/db';
import { buttonVariants } from '@/components/ui/button';
import { deleteGalleryItem } from './_actions';

export default async function AdminGalleryPage() {
  const items = await prisma.galleryItem.findMany({ orderBy: { order: 'asc' } });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Galeria</h1>
          <p className="text-sm text-muted-foreground">{items.length} itens · exibidos na página /galeria</p>
        </div>
        <Link href="/admin/galeria/novo" className={buttonVariants()}>+ Nova Foto</Link>
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <div key={item.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
              <div className="relative aspect-square bg-muted">
                <Image src={item.imageUrl} alt={item.title} fill className="object-cover" sizes="(max-width: 640px) 50vw, 25vw" />
                {!item.active && (
                  <span className="absolute left-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[0.65rem] font-medium text-white">Inativo</span>
                )}
              </div>
              <div className="space-y-2 p-3">
                <p className="truncate text-sm font-medium">{item.title}</p>
                {item.category && <p className="text-xs text-muted-foreground">{item.category}</p>}
                <div className="flex gap-2">
                  <Link href={`/admin/galeria/${item.id}`} className={buttonVariants({ variant: 'outline', size: 'sm' }) + ' flex-1'}>Editar</Link>
                  <form action={async () => { 'use server'; await deleteGalleryItem(item.id); }}>
                    <button type="submit" className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' text-destructive hover:text-destructive'}>Excluir</button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">
          <p className="text-sm">Nenhuma foto na galeria. Adicione a primeira.</p>
        </div>
      )}
    </div>
  );
}
