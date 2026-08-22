import Link from 'next/link';
import { prisma } from '@/lib/db';
import { buttonVariants } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ConfirmDeleteButton } from '@/components/admin/ConfirmDeleteButton';
import { deleteService } from './_actions';

export default async function AdminServicesPage() {
  const services = await prisma.serviceItem.findMany({ orderBy: { order: 'asc' } });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Serviços</h1>
          <p className="text-sm text-muted-foreground">{services.length} serviços · exibidos na página /servicos</p>
        </div>
        <Link href="/admin/servicos/novo" className={buttonVariants()}>+ Novo Serviço</Link>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead className="hidden md:table-cell">Descrição</TableHead>
              <TableHead className="text-right">Ordem</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.title}</TableCell>
                <TableCell className="hidden max-w-md truncate text-sm text-muted-foreground md:table-cell">{s.description}</TableCell>
                <TableCell className="text-right">{s.order}</TableCell>
                <TableCell>
                  <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${s.active ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                    {s.active ? 'Ativo' : 'Inativo'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Link href={`/admin/servicos/${s.id}`} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>Editar</Link>
                    <ConfirmDeleteButton
                      action={() => deleteService(s.id)}
                      confirmMessage={`Excluir "${s.title}"? Esta ação não pode ser desfeita.`}
                      label="Excluir"
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {services.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Nenhum serviço cadastrado.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
