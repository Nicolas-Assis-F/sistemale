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
import { formatTaxId } from '@/lib/domains/customers/tax-id';
import { customerFiscalReadiness, fiscalFormDefaults, principalAddressInclude } from '@/lib/domains/customers/fiscal-profile';
import { FiscalBadge, FiscalReadinessPanel } from '@/components/admin/FiscalReadinessPanel';
import { requireAdmin } from '@/lib/auth';

export default async function CustomersPage({ searchParams }: { searchParams: Promise<AdminListParams & { fiscal?: string }> }) {
  await requireAdmin(); // não depende só do proxy (defesa em profundidade)
  const { q = '', novo, editar, fiscal } = await searchParams;
  const [rows, selected] = await Promise.all([
    prisma.customer.findMany({ where: q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { code: { contains: q, mode: 'insensitive' } }, { city: { contains: q, mode: 'insensitive' } }] } : {}, orderBy: { createdAt: 'desc' }, include: { ...principalAddressInclude, _count: { select: { orders: true } }, user: { select: { emailVerified: true } } } }),
    editar ? prisma.customer.findUnique({ where: { id: editar }, include: principalAddressInclude }) : Promise.resolve(null),
  ]);
  if (editar && !selected) notFound();
  const withFiscal = rows.map((row) => ({ row, fiscal: customerFiscalReadiness(row) }));
  const readyCount = withFiscal.filter((r) => r.fiscal.ready).length;
  const visible = withFiscal.filter((r) => (fiscal === 'pendente' ? !r.fiscal.ready : fiscal === 'pronto' ? r.fiscal.ready : true));
  const closeHref = adminListHref('clientes', q);
  const createHref = adminListHref('clientes', q, { novo: '1' });
  return (
    <div className="le-admin-page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="le-kicker">Gestão / Clientes</p><h1 className="le-admin-title">Clientes</h1><p className="mt-2 text-sm text-le-muted">{rows.length} registro(s){q ? ' encontrados' : ' cadastrados'} · {readyCount} pronto(s) para faturar</p></div>
        <Link data-entity-create href={createHref} className={buttonVariants()}>+ Novo cliente</Link>
      </div>
      <AdminFilters placeholder="Buscar clientes" filters={[{ name: 'fiscal', label: 'Cadastro fiscal', options: [{ value: '', label: 'Todos' }, { value: 'pendente', label: 'Com pendências' }, { value: 'pronto', label: 'Pronto p/ NF-e' }] }]} />
      <AdminRecords createHref={createHref} createLabel="Cadastrar cliente" empty={q ? 'Nenhum resultado. Tente outro termo de busca.' : 'Nenhum registro ainda. Comece pelo primeiro cadastro.'}
        rows={visible.map(({ row, fiscal: readiness }) => ({
          id: row.id,
          title: <Link href={adminListHref('clientes', q, { editar: row.id })} className="hover:text-le-blue">{row.name}</Link>,
          details: [{ label: 'Código', value: <span className="font-mono text-xs">{row.code}</span> },
              { label: 'Cidade', value: row.city || '—' },
              { label: 'Pedidos', value: row._count.orders },
              { label: 'Fiscal', value: <FiscalBadge readiness={readiness} /> },
              { label: 'Portal', value: row.user ? <span className="rounded-full bg-le-success-surface px-2 py-0.5 text-[11px] font-semibold text-le-success">Conta ativa</span> : <span className="text-le-muted">—</span> }],
          actions: <><Link href={adminListHref('clientes', q, { editar: row.id })} className={buttonVariants({ variant: 'outline', size: 'sm' })}>Editar</Link><ConfirmDeleteButton action={deleteCustomer.bind(null, row.id)} confirmMessage={`Excluir "${row.name}"? Esta ação não pode ser desfeita.`} label="Excluir" /></>,
        }))} />
      {(novo === '1' || selected) && <EntitySheet key={selected?.id ?? 'new'} title={selected ? 'Editar cliente' : 'Cadastrar cliente'} closeHref={closeHref}>
        {selected && <div className="mb-5"><FiscalReadinessPanel readiness={customerFiscalReadiness(selected)} /></div>}
        <CustomerForm action={selected ? updateCustomer.bind(null, selected.id) : createCustomer} defaultValues={selected ? {
          name: selected.name, doc: formatTaxId(selected.doc ?? ''), email: selected.email ?? '', phone: selected.phone ?? '',
          contact: selected.contact ?? '', ...fiscalFormDefaults(selected),
        } : undefined} />
        {selected && <CustomerHistory customerId={selected.id} />}
      </EntitySheet>}
    </div>
  );
}
