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
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/funcionarios" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>← Voltar</Link>
        <h1 className="text-2xl font-bold">Editar Funcionário</h1>
      </div>
      <EmployeeForm
        action={updateWithId}
        submitLabel="Salvar Alterações"
        defaultValues={{ name: employee.name, role: employee.role ?? '', active: employee.active }}
      />
    </div>
  );
}
