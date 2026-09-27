import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { EmployeeForm } from '@/components/admin/EmployeeForm';
import { createEmployee } from '../_actions';

export default function NewEmployeePage() {
  return (
    <div className="le-admin-page">
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/admin/funcionarios" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>← Voltar</Link>
        <p className="le-kicker">Gestão / Funcionarios</p><h1 className="le-admin-title">Novo funcionário</h1>
      </div>
      <EmployeeForm action={createEmployee} submitLabel="Criar Funcionário" />
    </div>
  );
}
