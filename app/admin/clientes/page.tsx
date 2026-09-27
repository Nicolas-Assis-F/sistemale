import { CustomerHistory } from '@/components/admin/CustomerHistory';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { buttonVariants } from '@/components/ui/button';
import { AdminFilters } from '@/components/admin/AdminFilters';
import { AdminRecords } from '@/components/admin/AdminRecords';
import { EntitySheet } from '@/components/admin/EntitySheet';
import { CustomerForm } from '@/components/admin/CustomerForm';
import { ConfirmDeleteButton } from '@/components/admin/ConfirmDeleteButton';
import { adminListHref, type AdminListParams } from '@/lib/admin-list';
import { createCustomer, updateCustomer, deleteCustomer } from './_actions';

export default async function CustomersPage({ searchParams }: { searchParams: Promise<AdminListParams> }) {
  const { q = '', novo, editar } = await searchParams;
  const [rows, selected] = await Promise.all([
    prisma.customer.findMany({ where: q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { code: { contains: q, mode: 'insensitive' } }, { city: { contains: q, mode: 'insensitive' } }] } : {}, orderBy: { createdAt: 'desc' }, include: { _count: { select: { orders: true } }, user: { select: { emailVerified: true } } } }),
    editar ? prisma.customer.findUnique({ where: { id: editar } }) : Promise.resolve(null),
  ]);
  if (editar && !selected) notFound();
  const closeHref = adminListHref('clientes', q);
  const createHref = adminListHref('clientes', q, { novo: '1' });
  return (
    <div className="le-admin-page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="le-kicker">Gestão / Clientes</p><h1 className="le-admin-title">Clientes</h1><p className="mt-2 text-sm text-le-muted">{rows.length} registro(s){q ? ' encontrados' : ' cadastrados'}</p></div>
        <Link data-entity-create href={createHref} className={buttonVariants()}>+ Novo cliente</Link>
      </div>
      <AdminFilters placeholder="Buscar clientes" />
      <AdminRecords createHref={createHref} createLabel="Cadastrar cliente" empty={q ? 'Nenhum resultado. Tente outro termo de busca.' : 'Nenhum registro ainda. Comece pelo primeiro cadastro.'}
        rows={rows.map((row) => ({
          id: row.id,
          title: <Link href={adminListHref('clientes', q, { editar: row.id })} className="hover:text-le-blue">{row.name}</Link>,
          details: [{ label: 'Código', value: <span className="font-mono text-xs">{row.code}</span> },
              { label: 'Cidade', value: row.city || '—' },
              { label: 'Pedidos', value: row._count.orders },
              { label: 'Portal', value: row.user ? <span className="rounded-full bg-le-success-surface px-2 py-0.5 text-[11px] font-semibold text-le-success">Conta ativa</span> : <span className="text-le-muted">—</span> }],
          actions: <><Link href={adminListHref('clientes', q, { editar: row.id })} className={buttonVariants({ variant: 'outline', size: 'sm' })}>Editar</Link><ConfirmDeleteButton action={deleteCustomer.bind(null, row.id)} confirmMessage={`Excluir "${row.name}"? Esta ação não pode ser desfeita.`} label="Excluir" /></>,
        }))} />
      {(novo === '1' || selected) && <EntitySheet key={selected?.id ?? 'new'} title={selected ? 'Editar cliente' : 'Cadastrar cliente'} closeHref={closeHref}>
        <CustomerForm action={selected ? updateCustomer.bind(null, selected.id) : createCustomer} defaultValues={selected ? {
          name: selected.name, doc: selected.doc ?? '', email: selected.email ?? '', phone: selected.phone ?? '',
          address: selected.address ?? '', city: selected.city ?? '', state: selected.state ?? '', zip: selected.zip ?? '', contact: selected.contact ?? '',
        } : undefined} />
        {selected && <CustomerHistory customerId={selected.id} />}
      </EntitySheet>}
    </div>
  );
}
