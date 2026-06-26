import Link from 'next/link';
import { prisma } from '@/lib/db';
import { buttonVariants } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { deleteEmployee } from './_actions';

export default async function EmployeesPage() {
  const employees = await prisma.employee.findMany({ orderBy: { name: 'asc' } });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Funcionários</h1>
          <p className="text-sm text-muted-foreground">{employees.length} cadastrados</p>
        </div>
        <Link href="/admin/funcionarios/novo" className={buttonVariants()}>+ Novo Funcionário</Link>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden sm:table-cell">Função</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.name}</TableCell>
                <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">{e.role || '—'}</TableCell>
                <TableCell>
                  <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${e.active ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                    {e.active ? 'Ativo' : 'Inativo'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Link href={`/admin/funcionarios/${e.id}`} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>Editar</Link>
                    <form action={async () => { 'use server'; await deleteEmployee(e.id); }}>
                      <button type="submit" className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' text-destructive hover:text-destructive'}>Excluir</button>
                    </form>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {employees.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Nenhum funcionário cadastrado.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
