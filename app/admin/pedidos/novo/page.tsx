import Link from 'next/link';
import { prisma } from '@/lib/db';
import { buttonVariants } from '@/components/ui/button';
import { OrderForm } from '@/components/admin/OrderForm';
import { createOrder } from '../_actions';
import { requireAdmin } from '@/lib/auth';

export default async function NewOrderPage() {
  await requireAdmin(); // não depende só do proxy (defesa em profundidade)
  const [products, customers, employees] = await Promise.all([
    prisma.product.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true, sku: true, priceCents: true } }),
    prisma.customer.findMany({ orderBy: { name: 'asc' }, select: { id: true, code: true, name: true } }),
    prisma.employee.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="le-admin-page">
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/admin/pedidos" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>← Voltar</Link>
        <p className="le-kicker">Gestão / Pedidos</p><h1 className="le-admin-title">Novo pedido / orçamento</h1>
      </div>
      <OrderForm products={products} customers={customers} employees={employees} action={createOrder} submitLabel="Criar pedido" />
    </div>
  );
}
