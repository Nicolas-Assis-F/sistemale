import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { buttonVariants } from '@/components/ui/button';
import { EmployeeForm } from '@/components/admin/EmployeeForm';
import { updateEmployee } from '../_actions';

export default async function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) notFound();

  const updateWithId = updateEmployee.bind(null, id);

  return (
    <div className="le-admin-page">
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/admin/funcionarios" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>← Voltar</Link>
        <p className="le-kicker">Gestão / Funcionarios</p><h1 className="le-admin-title">Editar funcionário</h1>
      </div>
      <EmployeeForm
        action={updateWithId}
        submitLabel="Salvar alterações"
        defaultValues={{
          name: employee.name,
          role: employee.role ?? '',
          active: employee.active,
          phone: employee.phone ?? '',
          pixKey: employee.pixKey ?? '',
          commission: employee.commissionBps ? String(employee.commissionBps / 100).replace('.', ',') : '',
        }}
      />
    </div>
  );
}
