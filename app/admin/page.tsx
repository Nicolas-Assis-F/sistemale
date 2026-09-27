import { FinancialOverview } from '@/components/admin/FinancialOverview';
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { StatCard } from "@/components/admin/StatCard";
import {
  ArrowUpRight,
  Plus,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  ClipboardList,
} from "lucide-react";
export default async function AdminDashboard() {
  const [total, active, ordersOpen, unread, categories, products, recent] =
    await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { active: true } }),
      prisma.order.count({
        where: { status: { in: ["ORCAMENTO", "PEDIDO", "EM_FABRICACAO"] } },
      }),
      prisma.contactSubmission.count({ where: { read: false } }),
      prisma.category.findMany({
        orderBy: { order: "asc" },
        include: {
          _count: { select: { products: { where: { active: true } } } },
        },
      }),
      prisma.product.findMany({
        where: { active: true },
        select: { images: true, specs: true },
      }),
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { customer: { select: { name: true } } },
      }),
    ]);
  const published = categories.filter((c) => c._count.products > 0);
  const max = Math.max(...published.map((c) => c._count.products), 1);
  const photos = products.filter((p) => p.images.length > 0).length;
  const specs = products.filter(
    (p) => Object.keys(p.specs as object).length > 0,
  ).length;
  return (
    <div className="mx-auto max-w-[1500px] space-y-7 p-5 lg:p-10">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="le-kicker">Visão geral</p>
          <h1 className="mt-3 font-heading text-3xl font-medium tracking-[-.05em]">
            Tudo pronto para ir mais fundo.
          </h1>
          <p className="mt-2 text-xs text-le-muted">
            Acompanhe seu catálogo, suas solicitações e sua operação.
          </p>
        </div>
        <Link
          href="/admin/produtos/importar"
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          <Upload size={15} /> Importar produtos
        </Link>
      </div>
      <FinancialOverview />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Produtos publicados"
          value={active}
          detail={`${total} cadastros no total`}
          href="/admin/produtos?status=ativo"
        />
        <StatCard
          label="Linhas na vitrine"
          value={published.length}
          detail="Categorias com produtos publicados"
          href="/admin/categorias"
        />
        <StatCard
          label="Pedidos em andamento"
          value={ordersOpen}
          detail="Orçamentos, pedidos e fabricação"
          href="/admin/pedidos"
        />
        <StatCard
          label="Novas mensagens"
          value={unread}
          detail="Solicitações aguardando leitura"
          href="/admin/mensagens"
        />
      </div>
      <div className="grid items-stretch gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="rounded-2xl border border-le-line bg-white p-6 lg:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg font-medium tracking-tight">
                Seu catálogo, por linha
              </h2>
              <p className="mt-1 text-[11px] text-le-muted">
                Distribuição dos produtos publicados
              </p>
            </div>
            <Link
              href="/admin/categorias"
              aria-label="Gerenciar categorias"
              className="le-card-arrow"
            >
              <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="mt-8 space-y-5">
            {published.map((c) => (
              <div
                key={c.id}
                className="grid grid-cols-[125px_1fr_20px] items-center gap-4"
              >
                <span className="truncate text-[11px] text-le-muted">
                  {c.name}
                </span>
                <div className="h-3 overflow-hidden rounded bg-le-subtle">
                  <div
                    className="h-full rounded bg-le-blue"
                    style={{ width: `${(c._count.products / max) * 100}%` }}
                  />
                </div>
                <span className="text-right font-mono text-[11px] text-le-muted">
                  {c._count.products}
                </span>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-2xl bg-le-ink p-7 text-white">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15">
            <CheckCircle2 size={19} className="text-le-blue-light" />
          </span>
          <h2 className="mt-6 font-heading text-xl tracking-tight">
            Uma vitrine bem cuidada
            <br />
            vende confiança.
          </h2>
          <p className="mt-3 text-xs leading-6 text-white/70">
            Complete as fichas para facilitar a escolha dos seus clientes.
          </p>
          <div className="mt-8 space-y-4">
            {[
              ["Com fotos", photos],
              ["Com ficha técnica", specs],
            ].map(([label, count]) => (
              <div key={label}>
                <div className="mb-2 flex justify-between text-[11px] text-white/65">
                  <span>{label}</span>
                  <span>
                    {count} de {active}
                  </span>
                </div>
                <div className="h-1.5 rounded bg-white/10">
                  <div
                    className="h-full rounded bg-le-yellow"
                    style={{
                      width: `${active ? (Number(count) / active) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/admin/produtos"
            className="mt-8 flex items-center justify-between border-t border-white/15 pt-5 text-xs"
          >
            Gerenciar meu catálogo <ArrowUpRight size={16} />
          </Link>
        </section>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="rounded-2xl border bg-white p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-heading text-lg">Últimos pedidos</h2>
            <Link href="/admin/pedidos" className="text-xs text-primary">
              Ver todos →
            </Link>
          </div>
          {recent.length ? (
            <div className="mt-5 divide-y">
              {recent.map((o) => (
                <Link
                  key={o.id}
                  href={`/admin/pedidos/${o.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 py-4 text-xs"
                >
                  <div>
                    <strong>{o.number}</strong>
                    <p className="mt-1 text-muted-foreground">
                      {o.customer.name}
                    </p>
                  </div>
                  <span className="rounded-full bg-muted px-3 py-1.5">
                    {o.status.replaceAll("_", " ").toLowerCase()}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <ClipboardList className="mx-auto text-le-muted" size={28} />
              <p className="mt-4 text-sm text-muted-foreground">
                Sua próxima venda começa aqui.
              </p>
              <Link
                href="/admin/pedidos/novo"
                className="mt-3 inline-block text-xs text-primary"
              >
                Criar primeiro orçamento →
              </Link>
            </div>
          )}
        </section>
        <section className="rounded-2xl border bg-white p-7">
          <h2 className="font-heading text-lg">Acesso rápido</h2>
          <div className="mt-5 space-y-2">
            {[
              {
                href: "/admin/produtos/novo",
                label: "Cadastrar produto",
                icon: Plus,
              },
              {
                href: "/admin/produtos/importar",
                label: "Importar uma planilha",
                icon: Upload,
              },
              {
                href: "/admin/galeria",
                label: "Organizar a galeria",
                icon: ImageIcon,
              },
            ].map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-xl border border-le-line p-4 text-xs hover:bg-muted"
              >
                <Icon size={16} className="text-primary" />
                {label}
                <ArrowUpRight size={14} className="ml-auto text-le-muted" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
