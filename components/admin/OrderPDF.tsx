import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import path from 'path';

const COLORS = {
  primary: '#1e3a5f',
  primaryLight: '#e8ecf4',
  text: '#1a2840',
  textMuted: '#64748b',
  border: '#e2e8f0',
  rowAlt: '#f8fafc',
  white: '#ffffff',
};

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 9, color: COLORS.text, paddingTop: 32, paddingBottom: 56, paddingHorizontal: 36 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 12, borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  logo: { width: 90, height: 30, objectFit: 'contain' },
  headerRight: { alignItems: 'flex-end' },
  orderTitle: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: COLORS.primary },
  headerMeta: { fontSize: 8, color: COLORS.textMuted, marginTop: 2 },

  // De / Para
  partiesRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  partyBox: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, padding: 8 },
  partyLabel: { fontSize: 7.5, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  partyName: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: COLORS.text },
  partyDetail: { fontSize: 8, color: COLORS.textMuted, marginTop: 1.5, lineHeight: 1.4 },

  // Table
  tableHeader: { flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 4, paddingHorizontal: 6 },
  tableHeaderCell: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: COLORS.white },
  tableRow: { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  tableRowAlt: { backgroundColor: COLORS.rowAlt },
  tableCell: { fontSize: 8.5, color: COLORS.text },
  tableCellMuted: { fontSize: 7.5, color: COLORS.textMuted, marginTop: 1 },

  colName: { flex: 4 },
  colIcms: { width: 38, textAlign: 'right' },
  colUnit: { width: 60, textAlign: 'right' },
  colQty: { width: 36, textAlign: 'right' },
  colTotal: { width: 66, textAlign: 'right' },
  colQtyWide: { width: 60, textAlign: 'right' },

  // Totals
  totalsRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
  totalsBox: { width: 200, borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 4, backgroundColor: COLORS.primaryLight, padding: 8 },
  totalsLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  totalsLabel: { fontSize: 9, color: COLORS.text },
  totalsValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: COLORS.text },
  grandLabel: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: COLORS.primary },
  grandValue: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: COLORS.primary },

  // Terms
  terms: { marginTop: 16, gap: 3 },
  termRow: { flexDirection: 'row', gap: 6 },
  termLabel: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: COLORS.text, width: 130 },
  termValue: { fontSize: 8.5, color: COLORS.text },

  footer: { position: 'absolute', bottom: 24, left: 36, right: 36, borderTopWidth: 0.5, borderTopColor: COLORS.border, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 7, color: COLORS.textMuted },
});

type OrderItem = {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  unitPriceCents: number;
  icmsPercent: number;
};

export type OrderPDFData = {
  number: string;
  createdAt: Date;
  clientRef: string | null;
  deliveryDate: Date | null;
  paymentTerms: string | null;
  paymentMethod: string | null;
  customer: {
    code: string;
    name: string;
    doc: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    contact: string | null;
  };
  items: OrderItem[];
};

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function OrderPDF({ order, mode }: { order: OrderPDFData; mode: 'comercial' | 'fabricacao' }) {
  const logoPath = path.join(process.cwd(), 'public', 'LOGO.png');
  const isComercial = mode === 'comercial';
  const total = order.items.reduce((s, i) => s + i.quantity * i.unitPriceCents, 0);

  return (
    <Document title={`Pedido ${order.number}`} author="LE Torneadora" subject={isComercial ? 'Pedido' : 'Ordem de Fabricação'}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={logoPath} style={styles.logo} />
          <View style={styles.headerRight}>
            <Text style={styles.orderTitle}>{isComercial ? `Pedido ${order.number}` : `Ordem de Fabricação`}</Text>
            {!isComercial && <Text style={styles.headerMeta}>{order.number}</Text>}
            {order.clientRef && <Text style={styles.headerMeta}>Ref. Cliente: {order.clientRef}</Text>}
            <Text style={styles.headerMeta}>Data: {formatDate(order.createdAt)}</Text>
            <Text style={styles.headerMeta}>Cód. Cliente: {order.customer.code}</Text>
          </View>
        </View>

        {/* De / Para */}
        <View style={styles.partiesRow}>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>De</Text>
            <Text style={styles.partyName}>LE TORNEADORA LTDA</Text>
            <Text style={styles.partyDetail}>Rua X 13 SN, Quadra 12, Lote 19{'\n'}American Park – Aparecida de Goiânia/GO{'\n'}CEP 74953-140</Text>
            <Text style={styles.partyDetail}>CNPJ: 44.492.124/0001-07{'\n'}Tel: (62) 98601-8386 · letorneadora@gmail.com</Text>
          </View>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>Para</Text>
            <Text style={styles.partyName}>{order.customer.name}</Text>
            {order.customer.contact && <Text style={styles.partyDetail}>A/C: {order.customer.contact}</Text>}
            {order.customer.address && <Text style={styles.partyDetail}>{order.customer.address}</Text>}
            {(order.customer.city || order.customer.state) && (
              <Text style={styles.partyDetail}>{[order.customer.city, order.customer.state].filter(Boolean).join(' – ')} {order.customer.zip ?? ''}</Text>
            )}
            {order.customer.doc && <Text style={styles.partyDetail}>CNPJ/CPF: {order.customer.doc}</Text>}
          </View>
        </View>

        {/* Table */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, styles.colName]}>DESIGNAÇÃO</Text>
          {isComercial ? (
            <>
              <Text style={[styles.tableHeaderCell, styles.colIcms]}>ICMS</Text>
              <Text style={[styles.tableHeaderCell, styles.colUnit]}>PREÇO UNIT.</Text>
              <Text style={[styles.tableHeaderCell, styles.colQty]}>QTD.</Text>
              <Text style={[styles.tableHeaderCell, styles.colTotal]}>TOTAL</Text>
            </>
          ) : (
            <Text style={[styles.tableHeaderCell, styles.colQtyWide]}>QUANT.</Text>
          )}
        </View>

        {order.items.map((it, idx) => (
          <View key={it.id} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
            <View style={styles.colName}>
              <Text style={styles.tableCell}>{it.name}</Text>
              {it.description && <Text style={styles.tableCellMuted}>{it.description}</Text>}
            </View>
            {isComercial ? (
              <>
                <Text style={[styles.tableCell, styles.colIcms]}>{it.icmsPercent}%</Text>
                <Text style={[styles.tableCell, styles.colUnit]}>{formatBRL(it.unitPriceCents)}</Text>
                <Text style={[styles.tableCell, styles.colQty]}>{it.quantity}</Text>
                <Text style={[styles.tableCell, styles.colTotal]}>{formatBRL(it.quantity * it.unitPriceCents)}</Text>
              </>
            ) : (
              <Text style={[styles.tableCell, styles.colQtyWide]}>{it.quantity}</Text>
            )}
          </View>
        ))}

        {/* Totais (só comercial) */}
        {isComercial && (
          <View style={styles.totalsRow}>
            <View style={styles.totalsBox}>
              <View style={styles.totalsLine}>
                <Text style={styles.totalsLabel}>Total (sem imposto)</Text>
                <Text style={styles.totalsValue}>{formatBRL(total)}</Text>
              </View>
              <View style={[styles.totalsLine, { marginTop: 4, borderTopWidth: 0.5, borderTopColor: COLORS.primary, paddingTop: 4 }]}>
                <Text style={styles.grandLabel}>Total</Text>
                <Text style={styles.grandValue}>{formatBRL(total)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Termos */}
        <View style={styles.terms}>
          {order.paymentTerms && (
            <View style={styles.termRow}>
              <Text style={styles.termLabel}>Termos de pagamento:</Text>
              <Text style={styles.termValue}>{order.paymentTerms}</Text>
            </View>
          )}
          {isComercial && order.paymentMethod && (
            <View style={styles.termRow}>
              <Text style={styles.termLabel}>Forma de pagamento:</Text>
              <Text style={styles.termValue}>{order.paymentMethod}</Text>
            </View>
          )}
          {order.deliveryDate && (
            <View style={styles.termRow}>
              <Text style={styles.termLabel}>Data prevista de entrega:</Text>
              <Text style={styles.termValue}>{formatDate(order.deliveryDate)}</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Capital de 250.000 R$ · CNPJ: 44.492.124/0001-07 · Inscrição Estadual: 10.875.250-0</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
