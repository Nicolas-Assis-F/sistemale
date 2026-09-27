import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { buttonVariants } from '@/components/ui/button';
import { OrderForm, type OrderItemState } from '@/components/admin/OrderForm';
import { updateOrder } from '../../_actions';

export default async function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [order, products, customers, employees] = await Promise.all([
    prisma.order.findUnique({ where: { id }, include: { items: { orderBy: { position: 'asc' } } } }),
    prisma.product.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true, sku: true, priceCents: true } }),
    prisma.customer.findMany({ orderBy: { name: 'asc' }, select: { id: true, code: true, name: true } }),
    prisma.employee.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);
  if (!order) notFound();

  const updateWithId = updateOrder.bind(null, id);

  const items: OrderItemState[] = order.items.map((it) => ({
    key: it.id,
    productId: it.productId,
    name: it.name,
    description: it.description ?? '',
    quantity: it.quantity,
    priceReais: (it.unitPriceCents / 100).toFixed(2).replace('.', ','),
    icmsPercent: it.icmsPercent,
  }));

  return (
    <div className="le-admin-page">
      <div className="flex flex-wrap items-center gap-4">
        <Link href={`/admin/pedidos/${id}`} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>← Voltar</Link>
        <h1 className="font-mono text-2xl font-bold">Editar {order.number}</h1>
      </div>
      <OrderForm
        products={products}
        customers={customers}
        employees={employees}
        action={updateWithId}
        submitLabel="Salvar alterações"
        defaultValues={{
          customerId: order.customerId,
          clientRef: order.clientRef ?? '',
          status: order.status,
          employeeId: order.employeeId ?? '',
          paymentTerms: order.paymentTerms ?? '',
          paymentMethod: order.paymentMethod ?? '',
          deliveryDate: order.deliveryDate ? order.deliveryDate.toISOString().slice(0, 10) : '',
          notes: order.notes ?? '',
          items,
        }}
      />
    </div>
  );
}
