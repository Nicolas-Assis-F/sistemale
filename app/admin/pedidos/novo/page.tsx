import Link from 'next/link';
import { prisma } from '@/lib/db';
import { buttonVariants } from '@/components/ui/button';
import { OrderForm } from '@/components/admin/OrderForm';
import { createOrder } from '../_actions';

export default async function NewOrderPage() {
  const [products, customers, employees] = await Promise.all([
    prisma.product.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true, sku: true, priceCents: true } }),
    prisma.customer.findMany({ orderBy: { name: 'asc' }, select: { id: true, code: true, name: true } }),
    prisma.employee.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/pedidos" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>← Voltar</Link>
        <h1 className="text-2xl font-bold">Novo Pedido / Orçamento</h1>
      </div>
      <OrderForm products={products} customers={customers} employees={employees} action={createOrder} submitLabel="Criar Pedido" />
    </div>
  );
}
