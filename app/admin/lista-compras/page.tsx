import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { prisma } from '@/lib/db';
import { DeleteListButton } from '@/components/admin/DeleteListButton';
import { ShoppingCart, Plus, FileText, ClipboardList } from 'lucide-react';

export default async function PurchaseListsPage() {
  const lists = await prisma.purchaseList.findMany({
    include: {
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="le-admin-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            Listas de Compras
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Listas de cotação de componentes para envio a fornecedores.
          </p>
        </div>
        <Link href="/admin/lista-compras/nova" className={buttonVariants({ size: 'sm' })}>
          <Plus className="h-4 w-4 mr-1.5" />
          Nova Lista
        </Link>
      </div>

      {lists.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-16 text-center text-muted-foreground">
          <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Nenhuma lista criada ainda.</p>
          <p className="text-sm mt-1">
            Crie uma lista selecionando peças de suas máquinas para gerar um PDF de cotação.
          </p>
          <Link
            href="/admin/lista-compras/nova"
            className={buttonVariants({ variant: 'secondary', size: 'sm', className: 'mt-4' })}
          >
            Criar primeira lista
          </Link>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="le-responsive-table w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Nome da Lista</th>
                <th className="text-center px-4 py-3 font-medium">Itens</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Criada em</th>
                <th className="px-4 py-3 w-36" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {lists.map((list) => (
                <tr key={list.id} className="hover:bg-muted/20 transition-colors">
                  <td data-label="Nome da Lista" className="px-4 py-3 font-medium">{list.name}</td>
                  <td data-label="Itens" className="px-4 py-3 text-center">
                    <Badge variant="secondary">{list._count.items}</Badge>
                  </td>
                  <td data-label="Criada em" className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {list.createdAt.toLocaleDateString('pt-BR')}
                  </td>
                  <td data-label="Nome da Lista" className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Link
                        href={`/admin/lista-compras/${list.id}`}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md hover:bg-muted transition-colors font-medium"
                      >
                        Ver
                      </Link>
                      <a
                        href={`/api/lista-compras/${list.id}/pdf`}
                        target="_blank"
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md hover:bg-muted transition-colors text-primary font-medium"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        PDF
                      </a>
                      <DeleteListButton id={list.id} name={list.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
