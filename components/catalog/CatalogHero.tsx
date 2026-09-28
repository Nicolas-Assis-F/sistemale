import Image from "next/image";
import { ArrowDown, ArrowDownToLine, ArrowUpRight, Factory, ScanLine, SlidersHorizontal } from "lucide-react";
import { buildWhatsAppUrl } from "@/lib/whatsapp-url";

export function CatalogHero({ productCount, categoryCount }: { productCount: number; categoryCount: number }) {
  return (
    <section className="le-showcase-hero" aria-labelledby="vitrine-title">
      <div className="le-container le-showcase-grid">
        <div className="le-showcase-copy">
          <p className="le-showcase-eyebrow"><span /> Engenharia que move sua operação</p>
          <h1 id="vitrine-title">Precisão na escolha.<br /><span>Potência em campo.</span></h1>
          <p className="le-showcase-description">Da máquina à conexão, encontre o equipamento certo para ir mais fundo. Compare especificações e fale direto com quem fabrica.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#catalogo" className="le-button bg-le-yellow text-le-ink">Explorar produtos <ArrowDown size={16} /></a>
            <a href={buildWhatsAppUrl()} target="_blank" rel="noopener noreferrer" className="le-showcase-contact">Falar com a fábrica <ArrowUpRight size={16} /></a>
          </div>
          <div className="le-showcase-counts"><span><strong>{productCount}</strong> produtos</span><span><strong>{categoryCount}</strong> linhas especializadas</span></div>
        </div>
        <figure className="le-showcase-photo">
          <Image src="/brand/vitrine-usinagem-v2.webp" alt="Ilustração de usinagem de uma conexão metálica em torno CNC, com iluminação azul e dourada" fill sizes="(max-width:767px) 100vw, (max-width:1100px) 50vw, 720px" className="object-cover" loading="eager" fetchPriority="high" />
          <div className="le-showcase-photo-label" aria-hidden><ScanLine size={20} /><span>Da precisão do torno<br /><strong>à força da sua operação.</strong></span></div>
          <figcaption>Imagem ilustrativa gerada por IA</figcaption>
        </figure>
      </div>
      <div className="le-showcase-strip">
        <div className="le-container flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-4">
          <span><Factory size={16} /> Direto da fábrica</span>
          <span><SlidersHorizontal size={16} /> Escolha por especificação</span>
          <a href="/catalogo/catalogo-letorneadora.pdf" target="_blank" rel="noopener noreferrer"><ArrowDownToLine size={16} /> Catálogo completo (PDF) <ArrowUpRight size={14} /></a>
        </div>
      </div>
    </section>
  );
}
