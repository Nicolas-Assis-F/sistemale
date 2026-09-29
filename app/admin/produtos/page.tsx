import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { formatCurrency, centsToCurrencyInput } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Suspense } from "react";
import { DeleteProductButton } from "@/components/admin/DeleteProductButton";
import { StatCard } from "@/components/admin/StatCard";
import { ProductFilters } from "@/components/admin/ProductFilters";
import { ProductFlagToggle } from "@/components/admin/ProductFlagToggle";
import { ProductPriceInline } from "@/components/admin/ProductPriceInline";
import { ProductSheet } from "@/components/admin/ProductSheet";
import { createProduct, updateProduct } from "./_actions";
import {
  Plus,
  Upload,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Package,
} from "lucide-react";
import type { Prisma } from "@prisma/client";
import { requireAdmin } from '@/lib/auth';
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    categoria?: string;
    pagina?: string;
    status?: string;
    novo?: string;
    editar?: string;
  }>;
}) {
  await requireAdmin(); // não depende só do proxy (defesa em profundidade)
  const {
    q = "",
    categoria = "",
    pagina = "1",
    status = "",
    novo,
    editar,
  } = await searchParams;
  const pageSize = 10;
  const where: Prisma.ProductWhereInput = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { sku: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(categoria ? { categoryId: categoria } : {}),
    ...(status === "ativo"
      ? { active: true }
      : status === "inativo"
        ? { active: false }
        : status === "semfoto"
          ? { active: true, images: { isEmpty: true } }
          : {}),
  };
  const [count, categories, total, active, withoutPhoto, editing] = await Promise.all([
    prisma.product.count({ where }),
    prisma.category.findMany({ orderBy: { order: "asc" } }),
    prisma.product.count(),
    prisma.product.count({ where: { active: true } }),
    prisma.product.count({
      where: { active: true, images: { isEmpty: true } },
    }),
    editar
      ? prisma.product.findUnique({
          where: { id: editar },
          include: { _count: { select: { partItems: true } } },
        })
      : null,
  ]);
  const pages = Math.max(1, Math.ceil(count / pageSize));
  const parsed = Number(pagina);
  const page = Math.min(
    pages,
    Math.max(1, Number.isSafeInteger(parsed) ? parsed : 1),
  );
  const products = await prisma.product.findMany({
    where,
    include: { category: true },
    orderBy: [{ active: "desc" }, { createdAt: "desc" }, { id: "asc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  function listUrl(extra: Record<string, string> = {}) {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (categoria) p.set("categoria", categoria);
    if (status) p.set("status", status);
    if (page > 1) p.set("pagina", String(page));
    for (const [k, v] of Object.entries(extra)) p.set(k, v);
    const qs = p.toString();
    return `/admin/produtos${qs ? `?${qs}` : ""}`;
  }
  const pageUrl = (n: number) => listUrl({ pagina: String(n) });
  const editUrl = (id: string) => listUrl({ editar: id });
  const sheetCategories = [...categories].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR"),
  );
  return (
    <div className="mx-auto max-w-[1500px] space-y-7 p-5 lg:p-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="le-kicker">Catálogo / produtos</p>
          <h1 className="mt-3 font-heading text-3xl font-medium tracking-[-.05em]">
            Sua linha. Bem apresentada.
          </h1>
          <p className="mt-2 text-xs text-le-muted">
            Edite fichas, organize imagens e controle o que aparece na vitrine.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/produtos/importar"
            className="le-button le-button-outline"
          >
            <Upload size={15} /> Importar
          </Link>
          <Link
            href={listUrl({ novo: "1" })}
            scroll={false}
            className="le-button le-button-blue"
          >
            <Plus size={16} /> Novo produto
          </Link>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Produtos cadastrados"
          value={total}
          detail="Todas as referências do catálogo"
          href="/admin/produtos"
        />
        <StatCard
          label="Publicados na vitrine"
          value={active}
          detail="Visíveis para seus clientes"
          href="/admin/produtos?status=ativo"
        />
        <StatCard
          label="Precisam de imagem"
          value={withoutPhoto}
          detail="Produtos publicados sem foto"
          href="/admin/produtos?status=semfoto"
        />
      </div>
      <section className="overflow-hidden rounded-2xl border border-le-line bg-white">
        <Suspense>
          <ProductFilters
            categories={sheetCategories}
            counts={{
              all: total,
              active,
              archived: total - active,
              noPhoto: withoutPhoto,
            }}
          />
        </Suspense>
        <div className="overflow-x-auto">
          <Table className="le-responsive-table ">
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Produto</TableHead>{" "}
                <TableHead>Referência</TableHead>
                <TableHead>Linha</TableHead>
                <TableHead>Preço <span className="font-normal normal-case text-le-muted">(clique p/ editar)</span></TableHead>
                <TableHead>Vitrine</TableHead>
                <TableHead className="w-16 text-center">Destaque</TableHead>
                <TableHead className="text-right pr-6">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow
                  key={p.id}
                  className={editar === p.id ? "bg-le-subtle" : undefined}
                >
                  <TableCell data-label="Produto" className="pl-6">
                    <Link
                      href={editUrl(p.id)}
                      scroll={false}
                      className="group/name flex items-center gap-3"
                    >
                      <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border bg-le-subtle">
                        {p.images[0] ? (
                          <Image
                            src={p.images[0]}
                            alt=""
                            fill
                            sizes="48px"
                            className="object-contain p-1 mix-blend-multiply"
                          />
                        ) : (
                          <Package
                            size={18}
                            className="m-3 text-muted-foreground"
                          />
                        )}
                      </span>
                      <span className="max-w-60">
                        <strong className="block truncate text-xs font-medium transition-colors group-hover/name:text-le-blue">
                          {p.name}
                        </strong>
                        <span className="mt-1 block text-[11px] text-le-muted">
                          {p.images.length} fotos ·{" "}
                          {Object.keys(p.specs as object).length} especificações
                        </span>
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell data-label="Referência" className="font-mono text-[11px] text-le-muted">
                    {p.sku}
                  </TableCell>
                  <TableCell data-label="Linha" className="text-xs text-le-muted">
                    {p.category.name}
                  </TableCell>
                  <TableCell data-label="Preço">
                    <ProductPriceInline id={p.id} name={p.name} priceCents={p.priceCents} />
                  </TableCell>
                  <TableCell data-label="Vitrine">
                    <ProductFlagToggle
                      id={p.id}
                      field="active"
                      value={p.active}
                      name={p.name}
                    />
                  </TableCell>
                  <TableCell data-label="Destaque">
                    <div className="flex justify-center">
                      <ProductFlagToggle
                        id={p.id}
                        field="featured"
                        value={p.featured}
                        name={p.name}
                      />
                    </div>
                  </TableCell>
                  <TableCell data-label="Ações" className="pr-5">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={editUrl(p.id)}
                        scroll={false}
                        aria-label={`Editar ${p.name}`}
                        className="rounded-lg border p-2 text-le-muted hover:text-primary"
                      >
                        <Pencil size={14} />
                      </Link>
                      <DeleteProductButton id={p.id} name={p.name} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!products.length && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-14 text-center text-sm text-muted-foreground"
                  >
                    Nenhum produto nesta seleção. Ajuste os filtros.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t px-6 py-5 text-[11px] text-le-muted">
          <p>
            {count
              ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, count)} de ${count} produtos`
              : "0 produtos"}
          </p>
          <nav
            aria-label="Paginação dos produtos"
            className="flex items-center gap-2"
          >
            {page > 1 ? (
              <Link
                href={pageUrl(page - 1)}
                className="rounded-lg border p-2"
                aria-label="Página anterior"
              >
                <ChevronLeft size={14} />
              </Link>
            ) : (
              <span className="rounded-lg border p-2 opacity-30">
                <ChevronLeft size={14} />
              </span>
            )}
            <span className="px-3">
              Página {page} de {pages}
            </span>
            {page < pages ? (
              <Link
                href={pageUrl(page + 1)}
                className="rounded-lg border p-2"
                aria-label="Próxima página"
              >
                <ChevronRight size={14} />
              </Link>
            ) : (
              <span className="rounded-lg border p-2 opacity-30">
                <ChevronRight size={14} />
              </span>
            )}
          </nav>
        </div>
      </section>
      {novo && (
        <ProductSheet
          key="novo"
          mode="new"
          closeHref={listUrl()}
          categories={sheetCategories}
          action={createProduct}
        />
      )}
      {editing && (
        <ProductSheet
          key={editing.id}
          mode="edit"
          closeHref={listUrl()}
          categories={sheetCategories}
          action={updateProduct.bind(null, editing.id)}
          productId={editing.id}
          productSlug={editing.slug}
          partCount={editing._count.partItems}
          defaultValues={{
            name: editing.name,
            slug: editing.slug,
            sku: editing.sku,
            categoryId: editing.categoryId,
            shortDesc: editing.shortDesc,
            description: editing.description,
            priceReais: centsToCurrencyInput(editing.priceCents),
            originalPriceReais: editing.originalPriceCents
              ? centsToCurrencyInput(editing.originalPriceCents)
              : "",
            stock: editing.stock,
            active: editing.active,
            featured: editing.featured,
            images: editing.images,
            specs: Object.entries(editing.specs as Record<string, string>).map(
              ([key, value]) => ({ key, value }),
            ),
          }}
        />
      )}
    </div>
  );
}
