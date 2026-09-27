import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import { ArrowUpRight, ArrowLeft, Check, FileDown, FileText } from "lucide-react";
import { getCatalog } from "@/lib/catalog";
import { ProductGallery } from "@/components/public/ProductGallery";
import { MotionProductCard } from "@/components/catalog/MotionProductCard";
import { CompareToggle } from "@/components/catalog/CompareToggle";
import { QuoteRequestButton } from "@/components/account/QuoteRequestButton";
import { ProductStickyCTA } from "@/components/catalog/ProductStickyCTA";
import { SnapRail } from "@/components/catalog/SnapRail";
import { SpecIcon, WhatsAppIcon } from "@/components/catalog/icons";
import { keySpecs, shortSpecLabel } from "@/lib/catalog-utils";
import { Entrance } from "@/components/public/Entrance";
import { buildWhatsAppUrl } from "@/lib/whatsapp-url";
import { formatCurrency } from "@/lib/format";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = (await getCatalog()).find((p) => p.slug === slug);
  return product
    ? {
        title: product.name,
        description: product.shortDesc,
        alternates: { canonical: `/vitrine/${slug}` },
      }
    : {};
}
export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const products = await getCatalog();
  const product = products.find((p) => p.slug === slug);
  if (!product) notFound();
  // Mesma linha primeiro, depois o restante do catálogo
  const related = products
    .filter((p) => p.id !== product.id)
    .sort(
      (a, b) =>
        Number(b.category.slug === product.category.slug) -
        Number(a.category.slug === product.category.slug),
    )
    .slice(0, 8);
  const highlights = keySpecs(product, 4);
  return (
    <div className="le-container pb-24">
      <nav
        className="flex flex-wrap items-center gap-3 py-8 text-[11px] text-le-muted"
        aria-label="Caminho de navegação"
      >
        <Link
          href="/vitrine"
          className="flex items-center gap-2 hover:text-primary"
        >
          <ArrowLeft size={13} /> Vitrine
        </Link>
        <span>/</span>
        <Link href={`/vitrine?categoria=${product.category.slug}`}>
          {product.category.name}
        </Link>
        <span>/</span>
        <span className="text-le-text">{product.name}</span>
      </nav>
      <div className="grid items-start gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <Entrance>
          <ProductGallery images={product.images} productName={product.name} />
          <p className="mt-4 text-[11px] text-le-muted">
            Fotos do catálogo L&E. Consulte configurações e condições de
            fornecimento.
          </p>
        </Entrance>
        <Entrance delay={0.1} className="py-3 lg:sticky lg:top-28">
          <p className="le-kicker">
            {product.category.name}{" "}
            <span className="px-2 text-le-muted">/</span> {product.sku}
          </p>
          <h1 className="le-title mt-5">{product.name}</h1>
          <p className="mt-6 text-sm leading-7 text-le-muted">
            {product.shortDesc}
          </p>
          <dl className="mt-7 grid grid-cols-2 gap-3">
            {highlights.map(({ key: k, value: v }) => (
              <div
                key={k}
                className="rounded-2xl border border-le-line bg-linear-to-b from-white to-le-canvas px-4 py-4"
              >
                <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-le-muted">
                  <SpecIcon specKey={k} size={13} className="text-le-blue" />
                  {shortSpecLabel(k)}
                </dt>
                <dd className="mt-2 font-heading text-[15px] font-semibold tracking-[-0.02em]">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="my-7 border-y border-le-line py-5">
            <p className="text-[11px] uppercase tracking-wider text-le-muted">
              {product.priceCents ? "Investimento" : "Condições comerciais"}
            </p>
            <p className="mt-2 font-heading text-2xl tracking-tight">
              {product.priceCents
                ? formatCurrency(product.priceCents)
                : "Cotação personalizada"}
            </p>
            <p className="mt-2 text-xs text-le-muted">
              {product.stock > 0
                ? "Produto com estoque cadastrado. Confirme a disponibilidade."
                : "Consulte prazo de fabricação e disponibilidade."}
            </p>
          </div>
          <a
            href={buildWhatsAppUrl({
              sku: product.sku,
              productName: product.name,
            })}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "whatsapp", size: "lg", className: "w-full" })}
          >
            <WhatsAppIcon className="h-4.5 w-4.5" /> Falar com especialista{" "}
            <ArrowUpRight size={17} />
          </a>
          <div className="mt-2.5 grid grid-cols-2 gap-2.5">
            <a
              href={`/vitrine/${product.slug}/ficha-tecnica`}
              download
              className="le-button le-button-outline gap-2 px-3"
            >
              <FileDown size={16} /> Ficha técnica (PDF)
            </a>
            <CompareToggle product={product} />
          </div>
          <QuoteRequestButton slug={product.slug} name={product.name} className="mt-2.5" />
          <ProductStickyCTA product={product} />
          <p className="mt-4 flex items-center justify-center gap-2 text-[11px] text-le-muted">
            <Check size={13} /> Atendimento direto com a engenharia da L&E
          </p>
        </Entrance>
      </div>
      <section
        id="ficha"
        className="mt-20 grid scroll-mt-44 gap-10 border-t border-le-line pt-12 lg:grid-cols-[.7fr_1.3fr]"
      >
        <div>
          <p className="le-kicker">Conheça cada detalhe</p>
          <h2 className="le-section-title mt-4">Ficha técnica.</h2>
          <p className="mt-4 max-w-xs text-sm leading-6 text-le-muted">
            Leve as especificações para a sua equipe: a ficha em PDF é gerada
            com os dados atualizados do equipamento.
          </p>
          <div className="mt-6 flex flex-col items-start gap-3">
            <a
              href={`/vitrine/${product.slug}/ficha-tecnica`}
              download
              className={buttonVariants({ variant: "dark", size: "lg" })}
            >
              <FileDown size={16} /> Baixar ficha técnica (PDF)
            </a>
            <a
              href="/catalogo/catalogo-letorneadora.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs text-primary"
            >
              <FileText size={15} /> Abrir catálogo completo
            </a>
          </div>
        </div>
        <dl className="overflow-hidden rounded-2xl border border-le-line bg-white">
          {Object.entries(product.specs).map(([k, v]) => (
            <div
              key={k}
              className="grid grid-cols-2 gap-4 border-b border-le-line px-5 py-4 text-sm transition-colors last:border-0 even:bg-le-subtle hover:bg-le-subtle"
            >
              <dt className="flex items-center gap-2.5 text-le-muted">
                <SpecIcon specKey={k} size={15} className="shrink-0 text-le-muted" />
                {k}
              </dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </section>
      {product.description && (
        <section id="detalhes" className="mt-12 max-w-3xl scroll-mt-44">
          <h2 className="font-heading text-xl">Sobre este equipamento</h2>
          <div className="prose prose-sm mt-4 text-le-muted">
            <ReactMarkdown>{product.description}</ReactMarkdown>
          </div>
        </section>
      )}
      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="le-section-title mb-8">Explore também.</h2>
          <SnapRail label="Equipamentos relacionados">
            {related.map((p) => (
              <MotionProductCard key={p.id} product={p} />
            ))}
          </SnapRail>
        </section>
      )}
    </div>
  );
}
