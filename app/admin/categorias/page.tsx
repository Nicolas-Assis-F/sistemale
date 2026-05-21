import Link from 'next/link';
import { prisma } from '@/lib/db';
import { buttonVariants } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { deleteCategory } from './_actions';

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { order: 'asc' },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Categorias</h1>
          <p className="text-muted-foreground text-sm">{categories.length} categorias</p>
        </div>
        <Link href="/admin/categorias/novo" className={buttonVariants()}>
          + Nova Categoria
        </Link>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="text-right">Produtos</TableHead>
              <TableHead className="text-right">Ordem</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((cat) => (
              <TableRow key={cat.id}>
                <TableCell className="font-medium">{cat.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{cat.slug}</TableCell>
                <TableCell className="text-right">{cat._count.products}</TableCell>
                <TableCell className="text-right">{cat.order}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/admin/categorias/${cat.id}`}
                      className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                    >
                      Editar
                    </Link>
                    <form
                      action={async () => {
                        'use server';
                        await deleteCategory(cat.id);
                      }}
                    >
                      <button
                        type="submit"
                        className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' text-destructive hover:text-destructive'}
                      >
                        Excluir
                      </button>
                    </form>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {categories.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhuma categoria criada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
