import { NextResponse, type NextRequest } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getMonthSummary } from '@/lib/finance/summary';
import { categoryLabel, currentCompetence } from '@/lib/finance-categories';
import { PAYMENT_METHOD_LABELS } from '@/lib/finance-labels';

export const runtime = 'nodejs';

const cell = (v: string | number | null | undefined) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const money = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');
const day = (d: Date | null) => (d ? d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '');

/** Lançamentos do mês em CSV (separador ;, padrão Excel pt-BR). */
export async function GET(req: NextRequest) {
  if (!(await isAuthenticated())) return new NextResponse('Não autorizado', { status: 401 });
  const mes = req.nextUrl.searchParams.get('mes');
  const competence = mes && /^\d{4}-\d{2}$/.test(mes) ? mes : currentCompetence();
  const s = await getMonthSummary(competence);

  const header = ['Tipo', 'Situação', 'Vencimento', 'Pagamento', 'Categoria', 'Descrição', 'Fornecedor/Cliente', 'Documento', 'Forma', 'Conta', 'Valor (R$)'];
  const rows: (string | number | null)[][] = [
    ...s.entries.map((e) => [
      e.type === 'RECEITA' ? 'Receita' : 'Despesa', e.status === 'PAGO' ? 'Pago' : 'Em aberto', day(e.dueDate), day(e.paidAt),
      categoryLabel(e.category), e.description, e.employee?.name ?? e.supplier, e.document, e.method, e.account,
      (e.type === 'DESPESA' ? '-' : '') + money(e.amountCents),
    ]),
    ...s.orderPaid.map((p) => [
      'Receita', 'Pago', '', day(p.paidAt), 'Vendas (pedidos)', `Pedido ${p.order.number}`, p.order.customer.name, p.order.number,
      PAYMENT_METHOD_LABELS[p.method], p.provider === 'ASAAS' ? 'Asaas' : '', money(p.amountCents),
    ]),
  ];
  const csv = '﻿' + [header, ...rows].map((r) => r.map(cell).join(';')).join('\r\n');
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="financeiro-${competence}.csv"`,
    },
  });
}
