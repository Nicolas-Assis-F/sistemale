import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { OrderView, ORDER_VIEW_SELECT } from '@/components/public/OrderView';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Acompanhe seu pedido', robots: { index: false, follow: false } };

/** Página pública do pedido (acesso por token aleatório, sem login). */
export default async function PublicOrderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) notFound();
  const order = await prisma.order.findUnique({ where: { publicToken: token }, select: ORDER_VIEW_SELECT });
  if (!order) notFound();
  return <OrderView order={order} />;
}
