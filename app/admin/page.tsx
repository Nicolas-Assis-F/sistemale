import Link from 'next/link';
import { prisma } from '@/lib/db';
import { buttonVariants } from '@/components/ui/button';
import { Package, Tag, Star, Eye, PlusCircle, ArrowRight } from 'lucide-react';

async function getDashboardStats() {
  const [total, active, featured, categories] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { active: true } }),
    prisma.product.count({ where: { featured: true } }),
    prisma.category.count(),
  ]);
  return { total, active, featured, categories };
}

export default async function AdminDashboard() {
  const stats = await getDashboardStats();

  const cards = [
    { label: 'Total de Produtos', value: stats.total, icon: Package, href: '/admin/produtos', color: 'text-primary' },
    { label: 'Produtos Ativos', value: stats.active, icon: Eye, href: '/admin/produtos', color: 'text-emerald-600' },
    { label: 'Em Destaque', value: stats.featured, icon: Star, href: '/admin/produtos', color: 'text-amber-500' },
    { label: 'Categorias', value: stats.categories, icon: Tag, href: '/admin/categorias', color: 'text-violet-600' },
  ];

  return (
    <div className="p-6 space-y-8">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Visão geral do catálogo · L & E Torneadora</p>
        </div>
        <Link href="/" target="_blank" className={buttonVariants({ variant: 'outline', size: 'sm' }) + ' gap-1.5'}>
          Ver site <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Cards de stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, href, color }) => (
          <Link
            key={label}
            href={href}
            className="group bg-card border border-border rounded-2xl p-5 hover:border-primary/40 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground">{label}</span>
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
            </div>
            <p className="text-3xl font-bold">{value}</p>
          </Link>
        ))}
      </div>

      {/* Ações rápidas */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Ações Rápidas</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/produtos/novo" className={buttonVariants({ size: 'sm' }) + ' gap-2'}>
            <PlusCircle className="h-4 w-4" /> Novo Produto
          </Link>
          <Link href="/admin/categorias/novo" className={buttonVariants({ variant: 'outline', size: 'sm' }) + ' gap-2'}>
            <PlusCircle className="h-4 w-4" /> Nova Categoria
          </Link>
          <Link href="/admin/produtos" className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' gap-2'}>
            <Package className="h-4 w-4" /> Gerenciar Produtos
          </Link>
        </div>
      </div>
    </div>
  );
}
