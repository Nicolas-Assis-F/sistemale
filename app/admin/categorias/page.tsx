import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { buttonVariants } from '@/components/ui/button';
import { AdminFilters } from '@/components/admin/AdminFilters';
import { AdminRecords } from '@/components/admin/AdminRecords';
import { EntitySheet } from '@/components/admin/EntitySheet';
import { CategoryForm } from '@/components/admin/CategoryForm';
import { ConfirmDeleteButton } from '@/components/admin/ConfirmDeleteButton';
import { adminListHref, type AdminListParams } from '@/lib/admin-list';
import { createCategory, updateCategory, deleteCategory } from './_actions';

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<AdminListParams> }) {
  const { q = '', novo, editar } = await searchParams;
  const [rows, selected] = await Promise.all([
    prisma.category.findMany({ where: q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { slug: { contains: q, mode: 'insensitive' } }] } : {}, orderBy: { order: 'asc' }, include: { _count: { select: { products: true } } } }),
    editar ? prisma.category.findUnique({ where: { id: editar } }) : Promise.resolve(null),
  ]);
  if (editar && !selected) notFound();
  const closeHref = adminListHref('categorias', q);
  const createHref = adminListHref('categorias', q, { novo: '1' });
  return (
    <div className="le-admin-page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="le-kicker">Gestão / Categorias</p><h1 className="le-admin-title">Categorias</h1><p className="mt-2 text-sm text-le-muted">{rows.length} registro(s){q ? ' encontrados' : ' cadastrados'}</p></div>
        <Link data-entity-create href={createHref} className={buttonVariants()}>+ Nova categoria</Link>
      </div>
      <AdminFilters placeholder="Buscar categorias" />
      <AdminRecords createHref={createHref} createLabel="Cadastrar categoria" empty={q ? 'Nenhum resultado. Tente outro termo de busca.' : 'Nenhum registro ainda. Comece pelo primeiro cadastro.'}
        rows={rows.map((row) => ({
          id: row.id,
          title: <Link href={adminListHref('categorias', q, { editar: row.id })} className="hover:text-le-blue">{row.name}</Link>,
          details: [{ label: 'URL', value: row.slug },
              { label: 'Produtos', value: row._count.products }],
          actions: <><Link href={adminListHref('categorias', q, { editar: row.id })} className={buttonVariants({ variant: 'outline', size: 'sm' })}>Editar</Link><ConfirmDeleteButton action={deleteCategory.bind(null, row.id)} confirmMessage={`Excluir "${row.name}"? Esta ação não pode ser desfeita.`} label="Excluir" /></>,
        }))} />
      {(novo === '1' || selected) && <EntitySheet key={selected?.id ?? 'new'} title={selected ? 'Editar categoria' : 'Cadastrar categoria'} closeHref={closeHref}>
        <CategoryForm action={selected ? updateCategory.bind(null, selected.id) : createCategory} defaultValues={selected ? {
          name: selected.name,
          slug: selected.slug,
          description: selected.description ?? '',
          icon: selected.icon ?? '',
          order: selected.order,
        } : undefined} />
      </EntitySheet>}
    </div>
  );
}
