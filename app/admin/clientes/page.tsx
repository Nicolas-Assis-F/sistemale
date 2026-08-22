import Link from 'next/link';
import { prisma } from '@/lib/db';
import { buttonVariants } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ConfirmDeleteButton } from '@/components/admin/ConfirmDeleteButton';
import { deleteCustomer } from './_actions';

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { orders: true } } },
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-sm text-muted-foreground">{customers.length} clientes</p>
        </div>
        <Link href="/admin/clientes/novo" className={buttonVariants()}>+ Novo Cliente</Link>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden md:table-cell">Cidade</TableHead>
              <TableHead className="text-right">Pedidos</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">{c.code}</TableCell>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                  {c.city ? `${c.city}${c.state ? ` – ${c.state}` : ''}` : '—'}
                </TableCell>
                <TableCell className="text-right">{c._count.orders}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Link href={`/admin/clientes/${c.id}`} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>Editar</Link>
                    <ConfirmDeleteButton
                      action={() => deleteCustomer(c.id)}
                      confirmMessage={`Excluir "${c.name}"? Esta ação não pode ser desfeita.`}
                      label="Excluir"
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {customers.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Nenhum cliente cadastrado.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
