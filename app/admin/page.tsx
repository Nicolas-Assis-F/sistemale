import Link from 'next/link';
import { prisma } from '@/lib/db';
import { buttonVariants } from '@/components/ui/button';
import {
  Package, Tag, Star, Eye, PlusCircle, ArrowRight, AlertTriangle,
  MessageSquare, Wrench, Images, Mail,
} from 'lucide-react';

const LOW_STOCK_THRESHOLD = 5;

async function getDashboardData() {
  const [
    total, active, featured, categoriesCount, services, galleryCount,
    unreadMessages, lowStock, lowStockList, recentContacts, perCategory,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { active: true } }),
    prisma.product.count({ where: { featured: true } }),
    prisma.category.count(),
    prisma.serviceItem.count({ where: { active: true } }),
    prisma.galleryItem.count({ where: { active: true } }),
    prisma.contactSubmission.count({ where: { read: false } }),
    prisma.product.count({ where: { active: true, stock: { lte: LOW_STOCK_THRESHOLD } } }),
    prisma.product.findMany({
      where: { active: true, stock: { lte: LOW_STOCK_THRESHOLD } },
      orderBy: { stock: 'asc' },
      take: 6,
      select: { id: true, name: true, sku: true, stock: true, priceCents: true },
    }),
    prisma.contactSubmission.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, subject: true, read: true, createdAt: true },
    }),
    prisma.category.findMany({
      orderBy: { order: 'asc' },
      select: { id: true, name: true, _count: { select: { products: true } } },
    }),
  ]);

  return {
    total, active, featured, categoriesCount, services, galleryCount,
    unreadMessages, lowStock, lowStockList, recentContacts, perCategory,
  };
}

const CHART_COLORS = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5'];

export default async function AdminDashboard() {
  const d = await getDashboardData();
  const maxCount = Math.max(1, ...d.perCategory.map((c) => c._count.products));

  const stats = [
    { label: 'Total de Produtos', value: d.total, icon: Package, href: '/admin/produtos', color: 'text-primary' },
    { label: 'Produtos Ativos', value: d.active, icon: Eye, href: '/admin/produtos', color: 'text-emerald-600' },
    { label: 'Em Destaque', value: d.featured, icon: Star, href: '/admin/produtos', color: 'text-amber-500' },
    { label: 'Categorias', value: d.categoriesCount, icon: Tag, href: '/admin/categorias', color: 'text-violet-600' },
  ];

  const alerts = [
    { show: d.unreadMessages > 0, label: 'mensagens não lidas', value: d.unreadMessages, icon: MessageSquare, href: '/admin/mensagens', tone: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
    { show: d.lowStock > 0, label: 'produtos com estoque baixo', value: d.lowStock, icon: AlertTriangle, href: '/admin/produtos', tone: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    { show: d.featured === 0, label: 'nenhum produto em destaque', value: '!', icon: Star, href: '/admin/produtos', tone: 'bg-destructive/10 text-destructive border-destructive/20' },
  ].filter((a) => a.show);

  return (
    <div className="space-y-8 p-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Visão geral · LE Torneadora</p>
        </div>
        <Link href="/" target="_blank" className={buttonVariants({ variant: 'outline', size: 'sm' }) + ' gap-1.5'}>
          Ver site <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Alertas */}
      {alerts.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {alerts.map((a) => {
            const Icon = a.icon;
            return (
              <Link key={a.label} href={a.href} className={`flex items-center gap-3 rounded-xl border p-4 transition-opacity hover:opacity-80 ${a.tone}`}>
                <Icon className="h-5 w-5 shrink-0" />
                <p className="text-sm font-medium">
                  <span className="font-bold">{a.value}</span> {a.label}
                </p>
              </Link>
            );
          })}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, href, color }) => (
          <Link
            key={label}
            href={href}
            className="group rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:border-primary/40 hover:shadow-raised"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{label}</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
            </div>
            <p className="text-3xl font-bold">{value}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Produtos por categoria */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold">Produtos por categoria</h2>
          {d.perCategory.length > 0 ? (
            <div className="space-y-3">
              {d.perCategory.map((cat, i) => (
                <div key={cat.id} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 truncate text-xs text-muted-foreground">{cat.name}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${CHART_COLORS[i % CHART_COLORS.length]}`}
                      style={{ width: `${(cat._count.products / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right text-xs font-semibold">{cat._count.products}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma categoria cadastrada.</p>
          )}
        </div>

        {/* Estoque baixo */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold">Estoque baixo</h2>
          </div>
          {d.lowStockList.length > 0 ? (
            <ul className="space-y-2.5">
              {d.lowStockList.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2">
                  <Link href={`/admin/produtos/${p.id}`} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium hover:text-primary">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.sku}</p>
                  </Link>
                  <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold ${p.stock === 0 ? 'bg-destructive/15 text-destructive' : 'bg-amber-500/15 text-amber-600'}`}>
                    {p.stock}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Tudo em ordem 👍</p>
          )}
        </div>
      </div>

      {/* Mensagens recentes */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Mensagens recentes</h2>
          </div>
          <Link href="/admin/mensagens" className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' gap-1 text-primary'}>
            Ver todas <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {d.recentContacts.length > 0 ? (
          <ul className="divide-y divide-border">
            {d.recentContacts.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {m.name}
                    {!m.read && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-blue-500 align-middle" />}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{m.subject || 'Sem assunto'}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {m.createdAt.toLocaleDateString('pt-BR')}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma mensagem recebida ainda.</p>
        )}
      </div>

      {/* Ações rápidas */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Ações Rápidas</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/produtos/novo" className={buttonVariants({ size: 'sm' }) + ' gap-2'}>
            <PlusCircle className="h-4 w-4" /> Novo Produto
          </Link>
          <Link href="/admin/servicos" className={buttonVariants({ variant: 'outline', size: 'sm' }) + ' gap-2'}>
            <Wrench className="h-4 w-4" /> Serviços ({d.services})
          </Link>
          <Link href="/admin/galeria" className={buttonVariants({ variant: 'outline', size: 'sm' }) + ' gap-2'}>
            <Images className="h-4 w-4" /> Galeria ({d.galleryCount})
          </Link>
          <Link href="/admin/conteudo" className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' gap-2'}>
            <Package className="h-4 w-4" /> Editar Conteúdo
          </Link>
        </div>
      </div>
    </div>
  );
}
