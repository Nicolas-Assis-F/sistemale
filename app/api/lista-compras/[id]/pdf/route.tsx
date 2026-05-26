import { type NextRequest, NextResponse } from 'next/server';
import React from 'react';
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer';
import { prisma } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';
import { PurchaseListPDF } from '@/components/admin/PurchaseListPDF';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  const authed = await isAuthenticated();
  if (!authed) {
    return new NextResponse('Não autorizado', { status: 401 });
  }

  const list = await prisma.purchaseList.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          partItem: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
            },
          },
        },
      },
    },
  });

  if (!list) {
    return new NextResponse('Lista não encontrada', { status: 404 });
  }

  const buffer = await renderToBuffer(
    React.createElement(PurchaseListPDF, { list }) as React.ReactElement<DocumentProps>,
  );

  const slug = list.name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const date = new Date().toISOString().split('T')[0];
  const filename = `cotacao-${slug}-${date}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
