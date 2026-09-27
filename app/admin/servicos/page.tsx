import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { buttonVariants } from '@/components/ui/button';
import { AdminFilters } from '@/components/admin/AdminFilters';
import { AdminRecords } from '@/components/admin/AdminRecords';
import { EntitySheet } from '@/components/admin/EntitySheet';
import { ServiceItemForm } from '@/components/admin/ServiceItemForm';
import { ConfirmDeleteButton } from '@/components/admin/ConfirmDeleteButton';
import { adminListHref, type AdminListParams } from '@/lib/admin-list';
import { createService, updateService, deleteService } from './_actions';

export default async function ServicesPage({ searchParams }: { searchParams: Promise<AdminListParams> }) {
  const { q = '', novo, editar } = await searchParams;
  const [rows, selected] = await Promise.all([
    prisma.serviceItem.findMany({ where: q ? { OR: [{ title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }] } : {}, orderBy: { order: 'asc' } }),
    editar ? prisma.serviceItem.findUnique({ where: { id: editar } }) : Promise.resolve(null),
  ]);
  if (editar && !selected) notFound();
  const closeHref = adminListHref('servicos', q);
  const createHref = adminListHref('servicos', q, { novo: '1' });
  return (
    <div className="le-admin-page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="le-kicker">Gestão / Serviços</p><h1 className="le-admin-title">Serviços</h1><p className="mt-2 text-sm text-le-muted">{rows.length} registro(s){q ? ' encontrados' : ' cadastrados'}</p></div>
        <Link data-entity-create href={createHref} className={buttonVariants()}>+ Novo serviço</Link>
      </div>
      <AdminFilters placeholder="Buscar serviços" />
      <AdminRecords createHref={createHref} createLabel="Cadastrar serviço" empty={q ? 'Nenhum resultado. Tente outro termo de busca.' : 'Nenhum registro ainda. Comece pelo primeiro cadastro.'}
        rows={rows.map((row) => ({
          id: row.id,
          title: <Link href={adminListHref('servicos', q, { editar: row.id })} className="hover:text-le-blue">{row.title}</Link>,
          details: [{ label: 'Ordem', value: row.order },
              { label: 'Status', value: row.active ? 'Ativo' : 'Inativo' }],
          actions: <><Link href={adminListHref('servicos', q, { editar: row.id })} className={buttonVariants({ variant: 'outline', size: 'sm' })}>Editar</Link><ConfirmDeleteButton action={deleteService.bind(null, row.id)} confirmMessage={`Excluir "${row.title}"? Esta ação não pode ser desfeita.`} label="Excluir" /></>,
        }))} />
      {(novo === '1' || selected) && <EntitySheet key={selected?.id ?? 'new'} title={selected ? 'Editar serviço' : 'Cadastrar serviço'} closeHref={closeHref}>
        <ServiceItemForm action={selected ? updateService.bind(null, selected.id) : createService} defaultValues={selected ? {
          title: selected.title,
          description: selected.description,
          icon: selected.icon ?? '',
          order: selected.order,
          active: selected.active,
        } : undefined} />
      </EntitySheet>}
    </div>
  );
}
