import { type NextRequest, NextResponse } from "next/server";
import React from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { getCatalog } from "@/lib/catalog";
import { keySpecs } from "@/lib/catalog-utils";
import { DataSheetPDF, type DataSheetData } from "@/components/catalog/DataSheetPDF";

export const runtime = "nodejs";

type ImageSrc = NonNullable<DataSheetData["image"]>;

/**
 * Carrega uma imagem (caminho de /public ou URL do Blob) e devolve PNG/JPG —
 * o react-pdf não lê WebP, formato das fotos do catálogo. Converte com sharp
 * (dependência opcional do Next) e, sem ele, aceita só PNG/JPG nativos.
 */
async function loadImage(src: string | undefined, origin: string): Promise<ImageSrc | null> {
  if (!src) return null;
  try {
    const res = await fetch(new URL(src, origin), { cache: "force-cache" });
    if (!res.ok) return null;
    const input = Buffer.from(await res.arrayBuffer());
    const type = res.headers.get("content-type") ?? "";
    try {
      const sharp = (await import("sharp")).default;
      const data = await sharp(input)
        .resize({ width: 900, height: 900, fit: "inside", withoutEnlargement: true })
        .flatten({ background: "#ffffff" })
        .jpeg({ quality: 84, mozjpeg: true })
        .toBuffer();
      return { data, format: "jpg" };
    } catch {
      if (type.includes("png")) return { data: input, format: "png" };
      if (type.includes("jpeg") || type.includes("jpg")) return { data: input, format: "jpg" };
      return null;
    }
  } catch {
    return null;
  }
}

function formatPhone(raw: string) {
  const d = raw.replace(/\D/g, "");
  const m = d.match(/^55(\d{2})(\d{4,5})(\d{4})$/);
  return m ? `+55 (${m[1]}) ${m[2]}-${m[3]}` : raw;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = (await getCatalog()).find((p) => p.slug === slug);
  if (!product) return new NextResponse("Produto não encontrado", { status: 404 });

  const origin = req.nextUrl.origin;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || origin).replace(/\/$/, "");
  const [image, logo] = await Promise.all([loadImage(product.images[0], origin), loadImage("/LOGO.png", origin)]);

  const buffer = await renderToBuffer(
    React.createElement(DataSheetPDF, {
      d: {
        name: product.name,
        sku: product.sku,
        category: product.category.name,
        shortDesc: product.shortDesc,
        description: product.description,
        specs: product.specs,
        highlights: keySpecs(product, 3),
        image,
        logo,
        phone: formatPhone(process.env.NEXT_PUBLIC_COMPANY_PHONE || "5562986018386"),
        siteUrl: siteUrl.replace(/^https?:\/\//, ""),
        productUrl: `${siteUrl.replace(/^https?:\/\//, "")}/vitrine/${product.slug}`,
      },
    }) as React.ReactElement<DocumentProps>,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="ficha-tecnica-${product.sku.toLowerCase()}.pdf"`,
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
