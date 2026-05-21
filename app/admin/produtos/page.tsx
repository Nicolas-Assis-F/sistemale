import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/db';
import { formatCurrency } from '@/lib/format';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { DeleteProductButton } from '@/components/admin/DeleteProductButton';

interface PageProps {
  searchParams: Promise<{ q?: string; categoria?: string }>;
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const { q, categoria } = await searchParams;

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: {
        ...(q ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { sku: { contains: q, mode: 'insensitive' } },
          ],
        } : {}),
        ...(categoria ? { categoryId: categoria } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: { category: { select: { name: true } } },
    }),
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Produtos</h1>
          <p className="text-muted-foreground text-sm">{products.length} produtos</p>
        </div>
        <Link href="/admin/produtos/novo" className={buttonVariants()}>
          + Novo Produto
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <form className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por nome ou SKU..."
            className="border rounded-lg px-3 py-1.5 text-sm bg-background h-9 w-64"
          />
          {categoria && <input type="hidden" name="categoria" value={categoria} />}
          <button type="submit" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            Buscar
          </button>
          {(q || categoria) && (
            <Link href="/admin/produtos" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
              Limpar
            </Link>
          )}
        </form>

        <div className="flex gap-1 flex-wrap">
          <Link
            href="/admin/produtos"
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${!categoria ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
          >
            Todas
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/admin/produtos?categoria=${cat.id}${q ? `&q=${q}` : ''}`}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${categoria === cat.id ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12" />
              <TableHead>Produto</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Preço</TableHead>
              <TableHead className="text-right">Estoque</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <div className="relative w-10 h-10 rounded overflow-hidden bg-muted shrink-0">
                    {product.images[0] && (
                      <Image
                        src={product.images[0]}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-medium max-w-[200px] truncate">
                  {product.name}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{product.sku}</TableCell>
                <TableCell className="text-sm">{product.category.name}</TableCell>
                <TableCell className="text-right text-sm">
                  {formatCurrency(product.priceCents)}
                </TableCell>
                <TableCell className="text-right text-sm">{product.stock}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {product.active ? (
                      <Badge variant="secondary" className="text-xs">Ativo</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">Inativo</Badge>
                    )}
                    {product.featured && (
                      <Badge className="text-xs">Destaque</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/admin/produtos/${product.id}`}
                      className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                    >
                      Editar
                    </Link>
                    <DeleteProductButton id={product.id} name={product.name} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {products.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Nenhum produto encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
