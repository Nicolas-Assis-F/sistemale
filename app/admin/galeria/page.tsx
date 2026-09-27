import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { buttonVariants } from '@/components/ui/button';
import { AdminFilters } from '@/components/admin/AdminFilters';
import { AdminRecords } from '@/components/admin/AdminRecords';
import { EntitySheet } from '@/components/admin/EntitySheet';
import { GalleryItemForm } from '@/components/admin/GalleryItemForm';
import { ConfirmDeleteButton } from '@/components/admin/ConfirmDeleteButton';
import { adminListHref, type AdminListParams } from '@/lib/admin-list';
import { createGalleryItem, updateGalleryItem, deleteGalleryItem } from './_actions';

export default async function GalleryPage({ searchParams }: { searchParams: Promise<AdminListParams> }) {
  const { q = '', novo, editar } = await searchParams;
  const [rows, selected] = await Promise.all([
    prisma.galleryItem.findMany({ where: q ? { OR: [{ title: { contains: q, mode: 'insensitive' } }, { category: { contains: q, mode: 'insensitive' } }] } : {}, orderBy: { order: 'asc' } }),
    editar ? prisma.galleryItem.findUnique({ where: { id: editar } }) : Promise.resolve(null),
  ]);
  if (editar && !selected) notFound();
  const closeHref = adminListHref('galeria', q);
  const createHref = adminListHref('galeria', q, { novo: '1' });
  return (
    <div className="le-admin-page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="le-kicker">Gestão / Galeria</p><h1 className="le-admin-title">Galeria</h1><p className="mt-2 text-sm text-le-muted">{rows.length} registro(s){q ? ' encontrados' : ' cadastrados'}</p></div>
        <Link data-entity-create href={createHref} className={buttonVariants()}>+ Nova foto</Link>
      </div>
      <AdminFilters placeholder="Buscar galeria" />
      <AdminRecords createHref={createHref} createLabel="Cadastrar foto" empty={q ? 'Nenhum resultado. Tente outro termo de busca.' : 'Nenhum registro ainda. Comece pelo primeiro cadastro.'}
        rows={rows.map((row) => ({
          id: row.id,
          title: <div className="flex items-center gap-3"><Image src={row.imageUrl} alt="" width={64} height={64} sizes="64px" className="size-16 rounded-xl object-cover" /><Link href={adminListHref('galeria', q, { editar: row.id })} className="hover:text-le-blue">{row.title}</Link></div>,
          details: [{ label: 'Categoria', value: row.category || '—' },
              { label: 'Status', value: row.active ? 'Ativo' : 'Inativo' }],
          actions: <><Link href={adminListHref('galeria', q, { editar: row.id })} className={buttonVariants({ variant: 'outline', size: 'sm' })}>Editar</Link><ConfirmDeleteButton action={deleteGalleryItem.bind(null, row.id)} confirmMessage={`Excluir "${row.title}"? Esta ação não pode ser desfeita.`} label="Excluir" /></>,
        }))} />
      {(novo === '1' || selected) && <EntitySheet key={selected?.id ?? 'new'} title={selected ? 'Editar foto' : 'Cadastrar foto'} closeHref={closeHref}>
        <GalleryItemForm action={selected ? updateGalleryItem.bind(null, selected.id) : createGalleryItem} defaultValues={selected ? {
          title: selected.title,
          description: selected.description ?? '',
          imageUrl: selected.imageUrl,
          category: selected.category ?? '',
          order: selected.order,
          active: selected.active,
        } : undefined} />
      </EntitySheet>}
    </div>
  );
}
