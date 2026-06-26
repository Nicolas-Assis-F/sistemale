import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { EmployeeForm } from '@/components/admin/EmployeeForm';
import { createEmployee } from '../_actions';

export default function NewEmployeePage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/funcionarios" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>← Voltar</Link>
        <h1 className="text-2xl font-bold">Novo Funcionário</h1>
      </div>
      <EmployeeForm action={createEmployee} submitLabel="Criar Funcionário" />
    </div>
  );
}
