import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { buttonVariants } from '@/components/ui/button';
import { AdminFilters } from '@/components/admin/AdminFilters';
import { AdminRecords } from '@/components/admin/AdminRecords';
import { EntitySheet } from '@/components/admin/EntitySheet';
import { EmployeeForm } from '@/components/admin/EmployeeForm';
import { ConfirmDeleteButton } from '@/components/admin/ConfirmDeleteButton';
import { adminListHref, type AdminListParams } from '@/lib/admin-list';
import { createEmployee, updateEmployee, deleteEmployee } from './_actions';

export default async function EmployeesPage({ searchParams }: { searchParams: Promise<AdminListParams> }) {
  const { q = '', novo, editar } = await searchParams;
  const [rows, selected] = await Promise.all([
    prisma.employee.findMany({ where: q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { role: { contains: q, mode: 'insensitive' } }] } : {}, orderBy: { name: 'asc' } }),
    editar ? prisma.employee.findUnique({ where: { id: editar } }) : Promise.resolve(null),
  ]);
  if (editar && !selected) notFound();
  const closeHref = adminListHref('funcionarios', q);
  const createHref = adminListHref('funcionarios', q, { novo: '1' });
  return (
    <div className="le-admin-page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="le-kicker">Gestão / Funcionários</p><h1 className="le-admin-title">Funcionários</h1><p className="mt-2 text-sm text-le-muted">{rows.length} registro(s){q ? ' encontrados' : ' cadastrados'}</p></div>
        <Link data-entity-create href={createHref} className={buttonVariants()}>+ Novo funcionário</Link>
      </div>
      <AdminFilters placeholder="Buscar funcionários" />
      <AdminRecords createHref={createHref} createLabel="Cadastrar funcionário" empty={q ? 'Nenhum resultado. Tente outro termo de busca.' : 'Nenhum registro ainda. Comece pelo primeiro cadastro.'}
        rows={rows.map((row) => ({
          id: row.id,
          title: <Link href={adminListHref('funcionarios', q, { editar: row.id })} className="hover:text-le-blue">{row.name}</Link>,
          details: [{ label: 'Função', value: row.role || '—' },
              { label: 'Status', value: row.active ? 'Ativo' : 'Inativo' }],
          actions: <><Link href={adminListHref('funcionarios', q, { editar: row.id })} className={buttonVariants({ variant: 'outline', size: 'sm' })}>Editar</Link><ConfirmDeleteButton action={deleteEmployee.bind(null, row.id)} confirmMessage={`Excluir "${row.name}"? Esta ação não pode ser desfeita.`} label="Excluir" /></>,
        }))} />
      {(novo === '1' || selected) && <EntitySheet key={selected?.id ?? 'new'} title={selected ? 'Editar funcionário' : 'Cadastrar funcionário'} closeHref={closeHref}>
        <EmployeeForm action={selected ? updateEmployee.bind(null, selected.id) : createEmployee} defaultValues={selected ? {
          name: selected.name,
          role: selected.role ?? '',
          active: selected.active,
          phone: selected.phone ?? '',
          pixKey: selected.pixKey ?? '',
          commission: selected.commissionBps ? String(selected.commissionBps / 100).replace('.', ',') : '',
        } : undefined} />
      </EntitySheet>}
    </div>
  );
}
