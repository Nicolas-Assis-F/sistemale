import React from "react";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

// Documento server-only (renderizado no route handler da ficha técnica).

const C = {
  ink: "#0b0a3b",
  blue: "#3158ef",
  yellow: "#f7cd47",
  text: "#1d1e48",
  muted: "#7b7d96",
  line: "#e6e8f1",
  zebra: "#f7f8fc",
  panel: "#f3f5fa",
};

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9.5, color: C.text, paddingBottom: 70 },
  band: { backgroundColor: C.ink, paddingHorizontal: 40, paddingVertical: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brandRow: { flexDirection: "row", alignItems: "center" },
  logo: { width: 38, height: 38, marginRight: 10 },
  brandName: { color: "#ffffff", fontSize: 13, fontFamily: "Helvetica-Bold", letterSpacing: -0.3 },
  brandTag: { color: "#9a9cc4", fontSize: 6.5, letterSpacing: 1.6, marginTop: 3 },
  docType: { color: "#ffffff", fontSize: 8, letterSpacing: 2, textAlign: "right" },
  docSku: { color: C.yellow, fontSize: 10, fontFamily: "Helvetica-Bold", textAlign: "right", marginTop: 3 },
  accent: { height: 3, flexDirection: "row" },
  body: { paddingHorizontal: 40, paddingTop: 22 },
  kicker: { color: C.blue, fontSize: 7.5, letterSpacing: 1.8, fontFamily: "Helvetica-Bold" },
  title: { fontSize: 24, fontFamily: "Helvetica-Bold", color: C.ink, marginTop: 6, letterSpacing: -0.6 },
  lead: { fontSize: 10, color: C.muted, marginTop: 8, lineHeight: 1.5, maxWidth: 440 },
  hero: { flexDirection: "row", marginTop: 20, gap: 14 },
  imageBox: { flex: 1.35, height: 196, backgroundColor: "#ffffff", borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 14, alignItems: "center", justifyContent: "center" },
  image: { width: "100%", height: "100%", objectFit: "contain" },
  noImage: { color: C.muted, fontSize: 9 },
  tiles: { flex: 1, gap: 8 },
  tile: { flex: 1, borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingHorizontal: 12, justifyContent: "center" },
  tileLabel: { fontSize: 6.8, color: C.muted, letterSpacing: 1.2 },
  tileValue: { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.ink, marginTop: 4 },
  sectionTitle: { fontSize: 8, letterSpacing: 1.8, fontFamily: "Helvetica-Bold", color: C.ink, marginTop: 20, marginBottom: 8 },
  table: { borderWidth: 1, borderColor: C.line, borderRadius: 8, overflow: "hidden" },
  row: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: C.line },
  rowLast: { borderBottomWidth: 0 },
  rowZebra: { backgroundColor: C.zebra },
  cellKey: { flex: 1, color: C.muted },
  cellVal: { flex: 1.4, fontFamily: "Helvetica-Bold", color: C.text },
  paragraph: { fontSize: 9.5, lineHeight: 1.6, color: "#4a4c6b", marginBottom: 6 },
  cta: { marginTop: 18, backgroundColor: C.panel, borderRadius: 10, padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderLeftWidth: 3, borderLeftColor: C.blue },
  ctaTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.ink },
  ctaText: { fontSize: 8.5, color: C.muted, marginTop: 3 },
  ctaPhone: { fontSize: 12, fontFamily: "Helvetica-Bold", color: C.blue },
  footer: { position: "absolute", bottom: 26, left: 40, right: 40, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 7, color: C.muted },
});

/** Helvetica padrão (WinAnsi) não tem ″, ′, ≤… — troca por equivalentes seguros. */
export function pdfSafe(text: string) {
  return text
    .replace(/[″“”]/g, '"')
    .replace(/[′‘’]/g, "'")
    .replace(/≤/g, "<=")
    .replace(/≥/g, ">=")
    .replace(/⌀|Ø/g, "Ø")
    .replace(/[^\u0000-ÿ–—•…€™"']/g, "");
}

/** Markdown → parágrafos de texto simples. */
function plainParagraphs(md: string) {
  return md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(/[*_`>]/g, "")
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter(Boolean);
}

export interface DataSheetData {
  name: string;
  sku: string;
  category: string;
  shortDesc: string;
  description: string;
  specs: Record<string, string>;
  highlights: { key: string; value: string }[];
  image?: { data: Buffer; format: "png" | "jpg" } | null;
  logo?: { data: Buffer; format: "png" | "jpg" } | null;
  phone: string;
  siteUrl: string;
  productUrl: string;
}

export function DataSheetPDF({ d }: { d: DataSheetData }) {
  const specs = Object.entries(d.specs);
  const issued = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const paragraphs = plainParagraphs(d.description).slice(0, 6);

  return (
    <Document title={`Ficha técnica — ${pdfSafe(d.name)}`} author="L&E Torneadora" subject={`Ficha técnica ${d.sku}`} creator="L&E Torneadora">
      <Page size="A4" style={s.page}>
        <View style={s.band} fixed>
          <View style={s.brandRow}>
            {d.logo && <Image src={d.logo} style={s.logo} />}
            <View>
              <Text style={s.brandName}>L&E TORNEADORA</Text>
              <Text style={s.brandTag}>ENGENHARIA PARA PERFURAÇÃO</Text>
            </View>
          </View>
          <View>
            <Text style={s.docType}>FICHA TÉCNICA</Text>
            <Text style={s.docSku}>{pdfSafe(d.sku)}</Text>
          </View>
        </View>
        <View style={s.accent} fixed>
          <View style={{ flex: 3, backgroundColor: C.blue }} />
          <View style={{ flex: 1, backgroundColor: C.yellow }} />
        </View>

        <View style={s.body}>
          <Text style={s.kicker}>{pdfSafe(d.category.toUpperCase())}</Text>
          <Text style={s.title}>{pdfSafe(d.name)}</Text>
          <Text style={s.lead}>{pdfSafe(d.shortDesc)}</Text>

          <View style={s.hero}>
            <View style={s.imageBox}>
              {d.image ? <Image src={d.image} style={s.image} /> : <Text style={s.noImage}>Imagem ilustrativa indisponível</Text>}
            </View>
            {d.highlights.length > 0 && (
              <View style={s.tiles}>
                {d.highlights.map((h) => (
                  <View key={h.key} style={s.tile}>
                    <Text style={s.tileLabel}>{pdfSafe(h.key.toUpperCase())}</Text>
                    <Text style={s.tileValue}>{pdfSafe(h.value)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {specs.length > 0 && (
            <View wrap={false}>
              <Text style={s.sectionTitle}>ESPECIFICAÇÕES TÉCNICAS</Text>
              <View style={s.table}>
                {specs.map(([k, v], i) => (
                  <View key={k} style={[s.row, i % 2 === 1 ? s.rowZebra : {}, i === specs.length - 1 ? s.rowLast : {}]}>
                    <Text style={s.cellKey}>{pdfSafe(k)}</Text>
                    <Text style={s.cellVal}>{pdfSafe(v)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {paragraphs.length > 0 && (
            <View>
              <Text style={s.sectionTitle}>SOBRE O EQUIPAMENTO</Text>
              {paragraphs.map((p, i) => (
                <Text key={i} style={s.paragraph}>{pdfSafe(p)}</Text>
              ))}
            </View>
          )}

          <View style={s.cta} wrap={false}>
            <View>
              <Text style={s.ctaTitle}>Solicite sua cotação</Text>
              <Text style={s.ctaText}>Informe o código {pdfSafe(d.sku)} para agilizar o atendimento.</Text>
              <Text style={s.ctaText}>{d.productUrl}</Text>
            </View>
            <Text style={s.ctaPhone}>{d.phone}</Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>L E TORNEADORA LTDA - ME · CNPJ 44.492.124/0001-07 · {d.siteUrl}</Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) => `Emitido em ${issued} · Dados sujeitos a alteração sem aviso · ${pageNumber}/${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
