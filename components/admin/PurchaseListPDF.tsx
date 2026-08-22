import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';
import path from 'path';
import { formatCurrency } from '@/lib/format';

// Brand colors (approximated from the oklch CSS variables)
const COLORS = {
  primary: '#1e3a5f',
  primaryLight: '#e8ecf4',
  accent: '#2563eb',
  text: '#1a2840',
  textMuted: '#64748b',
  border: '#e2e8f0',
  rowAlt: '#f8fafc',
  white: '#ffffff',
  red: '#dc2626',
  green: '#16a34a',
};

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: COLORS.text,
    paddingTop: 32,
    paddingBottom: 48,
    paddingHorizontal: 36,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  logo: {
    width: 100,
    height: 32,
    objectFit: 'contain',
  },
  companyInfo: {
    alignItems: 'flex-end',
  },
  companyName: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
  },
  companyDetail: {
    fontSize: 8,
    color: COLORS.textMuted,
    marginTop: 1,
  },

  // ── Title block ──
  titleBlock: {
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    padding: 10,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  titleMeta: {
    alignItems: 'flex-end',
  },
  titleDate: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.75)',
  },
  titleListName: {
    fontSize: 10,
    color: COLORS.white,
    fontFamily: 'Helvetica-Bold',
    marginTop: 2,
  },

  // ── Product section ──
  productSection: {
    marginBottom: 16,
  },
  productHeader: {
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 3,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  productName: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
  },
  productSku: {
    fontSize: 8,
    color: COLORS.textMuted,
  },

  // ── Table ──
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.white,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  tableRowAlt: {
    backgroundColor: COLORS.rowAlt,
  },
  tableCell: {
    fontSize: 8.5,
    color: COLORS.text,
  },
  tableCellMuted: {
    fontSize: 8,
    color: COLORS.textMuted,
  },
  tableCellCotar: {
    fontSize: 8,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  tableCellBold: {
    fontFamily: 'Helvetica-Bold',
  },

  // Column widths
  colName: { flex: 3 },
  colLocation: { flex: 2 },
  colCategory: { flex: 1.5 },
  colQty: { width: 30, textAlign: 'right' },
  colUnitPrice: { width: 55, textAlign: 'right' },
  colTotal: { width: 55, textAlign: 'right' },

  // ── Subtotal row ──
  subtotalRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 6,
    backgroundColor: COLORS.primaryLight,
  },
  subtotalCell: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
  },

  // ── Summary ──
  summarySection: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    padding: 10,
  },
  summaryTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
    paddingBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  summaryLabel: {
    fontSize: 8.5,
    color: COLORS.text,
  },
  summaryValue: {
    fontSize: 8.5,
    color: COLORS.text,
    fontFamily: 'Helvetica-Bold',
  },

  // Grand total
  grandTotalCard: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 4,
    padding: 10,
    backgroundColor: COLORS.primaryLight,
  },
  grandTotalLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
    marginBottom: 6,
  },
  grandTotalValue: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
  },
  grandTotalSub: {
    fontSize: 8,
    color: COLORS.textMuted,
    marginTop: 3,
  },

  // ── Footer ──
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 36,
    right: 36,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 7.5,
    color: COLORS.textMuted,
  },
  footerNote: {
    fontSize: 7.5,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },

  pageNumber: {
    fontSize: 7.5,
    color: COLORS.textMuted,
  },
});

type PurchaseListPDFProps = {
  list: {
    id: string;
    name: string;
    createdAt: Date;
    items: Array<{
      id: string;
      partItem: {
        id: string;
        name: string;
        location: string | null;
        category: string;
        quantity: number;
        unitPriceCents: number;
        notes: string | null;
        product: { id: string; name: string; sku: string };
      };
    }>;
  };
};

export function PurchaseListPDF({ list }: PurchaseListPDFProps) {
  const logoPath = path.join(process.cwd(), 'public', 'LOGO.png');

  // Group by product
  const byProduct = new Map<
    string,
    { product: { id: string; name: string; sku: string }; items: PurchaseListPDFProps['list']['items'] }
  >();
  for (const item of list.items) {
    const prod = item.partItem.product;
    if (!byProduct.has(prod.id)) byProduct.set(prod.id, { product: prod, items: [] });
    byProduct.get(prod.id)!.items.push(item);
  }

  // Summary by category
  const byCategory = new Map<string, { count: number; totalCents: number; uncoted: number }>();
  for (const item of list.items) {
    const cat = item.partItem.category;
    if (!byCategory.has(cat)) byCategory.set(cat, { count: 0, totalCents: 0, uncoted: 0 });
    const entry = byCategory.get(cat)!;
    entry.count += item.partItem.quantity;
    if (item.partItem.unitPriceCents > 0) {
      entry.totalCents += item.partItem.unitPriceCents * item.partItem.quantity;
    } else {
      entry.uncoted++;
    }
  }

  const totalCents = list.items.reduce(
    (sum, i) => sum + i.partItem.unitPriceCents * i.partItem.quantity,
    0,
  );
  const uncotedCount = list.items.filter((i) => i.partItem.unitPriceCents === 0).length;
  const today = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <Document
      title={`Lista de Cotação – ${list.name}`}
      author="L E Torneadora"
      subject="Lista de Compras"
    >
      <Page size="A4" style={styles.page}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <Image src={logoPath} style={styles.logo} />
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>L E TORNEADORA LTDA</Text>
            <Text style={styles.companyDetail}>CNPJ: 44.492.124/0001-07</Text>
            <Text style={styles.companyDetail}>Aparecida de Goiânia – GO</Text>
          </View>
        </View>

        {/* ── Title ── */}
        <View style={styles.titleBlock}>
          <Text style={styles.titleText}>LISTA DE COTAÇÃO</Text>
          <View style={styles.titleMeta}>
            <Text style={styles.titleDate}>Emitida em {today}</Text>
            <Text style={styles.titleListName}>{list.name}</Text>
          </View>
        </View>

        {/* ── Product sections ── */}
        {Array.from(byProduct.values()).map(({ product, items }) => {
          const subtotal = items.reduce(
            (sum, i) => sum + i.partItem.unitPriceCents * i.partItem.quantity,
            0,
          );
          return (
            <View key={product.id} style={styles.productSection}>
              {/* Product header */}
              <View style={styles.productHeader}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productSku}>SKU: {product.sku}</Text>
              </View>

              {/* Table header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, styles.colName]}>COMPONENTE</Text>
                <Text style={[styles.tableHeaderCell, styles.colLocation]}>LOCALIZAÇÃO</Text>
                <Text style={[styles.tableHeaderCell, styles.colCategory]}>CATEGORIA</Text>
                <Text style={[styles.tableHeaderCell, styles.colQty]}>QTD</Text>
                <Text style={[styles.tableHeaderCell, styles.colUnitPrice]}>PREÇO UNIT.</Text>
                <Text style={[styles.tableHeaderCell, styles.colTotal]}>TOTAL</Text>
              </View>

              {/* Table rows */}
              {items.map((item, idx) => (
                <View
                  key={item.id}
                  style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}
                >
                  <View style={styles.colName}>
                    <Text style={[styles.tableCell, styles.tableCellBold]}>{item.partItem.name}</Text>
                    {item.partItem.notes && (
                      <Text style={styles.tableCellMuted}>{item.partItem.notes}</Text>
                    )}
                  </View>
                  <Text style={[styles.tableCell, styles.colLocation]}>
                    {item.partItem.location || '—'}
                  </Text>
                  <Text style={[styles.tableCell, styles.colCategory]}>
                    {item.partItem.category}
                  </Text>
                  <Text style={[styles.tableCell, styles.colQty]}>
                    {item.partItem.quantity}
                  </Text>
                  <Text
                    style={[
                      item.partItem.unitPriceCents === 0 ? styles.tableCellCotar : styles.tableCell,
                      styles.colUnitPrice,
                    ]}
                  >
                    {item.partItem.unitPriceCents === 0
                      ? 'A cotar'
                      : formatCurrency(item.partItem.unitPriceCents)}
                  </Text>
                  <Text
                    style={[
                      item.partItem.unitPriceCents === 0 ? styles.tableCellCotar : styles.tableCell,
                      styles.colTotal,
                    ]}
                  >
                    {item.partItem.unitPriceCents === 0
                      ? '—'
                      : formatCurrency(item.partItem.unitPriceCents * item.partItem.quantity)}
                  </Text>
                </View>
              ))}

              {/* Subtotal */}
              <View style={styles.subtotalRow}>
                <Text style={[styles.subtotalCell, styles.colName]}>Subtotal</Text>
                <Text style={[styles.subtotalCell, styles.colLocation]} />
                <Text style={[styles.subtotalCell, styles.colCategory]} />
                <Text style={[styles.subtotalCell, styles.colQty]}>
                  {items.reduce((s, i) => s + i.partItem.quantity, 0)}
                </Text>
                <Text style={[styles.subtotalCell, styles.colUnitPrice]} />
                <Text style={[styles.subtotalCell, styles.colTotal]}>
                  {subtotal > 0 ? formatCurrency(subtotal) : '—'}
                </Text>
              </View>
            </View>
          );
        })}

        {/* ── Summary ── */}
        <View style={styles.summarySection}>
          {/* By category */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Resumo por Categoria</Text>
            {Array.from(byCategory.entries()).map(([cat, data]) => (
              <View key={cat} style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{cat}</Text>
                <Text style={styles.summaryValue}>
                  {data.totalCents > 0 ? formatCurrency(data.totalCents) : 'A cotar'}
                </Text>
              </View>
            ))}
          </View>

          {/* Grand total */}
          <View style={styles.grandTotalCard}>
            <Text style={styles.grandTotalLabel}>Total Geral</Text>
            <Text style={styles.grandTotalValue}>
              {totalCents > 0 ? formatCurrency(totalCents) : '—'}
            </Text>
            {uncotedCount > 0 && (
              <Text style={styles.grandTotalSub}>
                + {uncotedCount} {uncotedCount === 1 ? 'item' : 'itens'} a cotar
              </Text>
            )}
            <Text style={[styles.grandTotalSub, { marginTop: 8 }]}>
              {list.items.length} {list.items.length === 1 ? 'componente' : 'componentes'} no total
            </Text>
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>L E Torneadora – Lista de Cotação</Text>
          <Text style={styles.footerNote}>
            {uncotedCount > 0
              ? `* ${uncotedCount} ${uncotedCount === 1 ? 'item sem' : 'itens sem'} preço definido`
              : 'Todos os preços informados'}
          </Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
            fixed
          />
        </View>
      </Page>
    </Document>
  );
}
