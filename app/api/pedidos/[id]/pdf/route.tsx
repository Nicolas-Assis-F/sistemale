import { type NextRequest, NextResponse } from 'next/server';
import React from 'react';
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer';
import { prisma } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';
import { OrderPDF } from '@/components/admin/OrderPDF';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  const authed = await isAuthenticated();
  if (!authed) {
    return new NextResponse('Não autorizado', { status: 401 });
  }

  const mode = req.nextUrl.searchParams.get('tipo') === 'fabricacao' ? 'fabricacao' : 'comercial';

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      items: { orderBy: { position: 'asc' } },
    },
  });

  if (!order) {
    return new NextResponse('Pedido não encontrado', { status: 404 });
  }

  const buffer = await renderToBuffer(
    React.createElement(OrderPDF, { order, mode }) as React.ReactElement<DocumentProps>,
  );

  const filename = `pedido-${order.number}-${mode}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
    },
  });
}
