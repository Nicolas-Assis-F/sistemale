import { getHeroMedia } from "@/lib/hero-media";
import { HeroVideo } from "@/components/public/sections/HeroVideo";
import { buttonVariants } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowDown,
  MoveRight,
  Check,
  Layers3,
  Gauge,
  Cog,
  MapPin,
} from "lucide-react";
import type { CatalogProduct } from "@/lib/catalog";
import { Entrance } from "@/components/public/Entrance";
import { FeaturedShowcase } from "@/components/catalog/FeaturedShowcase";
import { buildWhatsAppUrl } from "@/lib/whatsapp-url";

export async function LandingPage({ products }: { products: CatalogProduct[] }) {
  const media = await getHeroMedia();
  const machine = products.find((p) => p.sku === "LE-AR100");
  const featured = products.filter((p) => p.featured).slice(0, 4);
  return (
    <>
      <section className={media ? "le-hero has-video" : "le-hero"}>
        {media && <HeroVideo media={media} />}
        <div className="le-container relative">
          <div className="le-hero-grid">
            <Entrance className="relative z-10 py-12 lg:py-20">
              <span className="le-hero-eyebrow">
                <span /> FABRICAÇÃO PRÓPRIA. FORÇA BRASILEIRA.
              </span>
              <h1 className="le-hero-title">
                Precisão que
                <br />
                leva você
                <br />
                <span>mais fundo.</span>
              </h1>
              <p className={`mt-7 max-w-[390px] text-base leading-7 ${media ? "text-white" : "text-le-muted"}`}>
                Equipamentos e componentes para perfuração de poços. Da nossa
                tornearia para o próximo grande projeto da sua operação.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/vitrine" className={buttonVariants({ variant: "primary", size: "lg" })}>
                  Explorar a vitrine <ArrowUpRight size={18} />
                </Link>
                <a
                  href={buildWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: "outline", size: "lg" })}
                >
                  Falar com especialista
                </a>
              </div>
              <div className={`mt-10 flex items-center gap-3 text-[11px] font-medium ${media ? "text-white" : "text-le-muted"}`}>
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-le-line">
                  <MapPin size={13} />
                </span>
                Feito em Aparecida de Goiânia. Para ir além.
              </div>
            </Entrance>
            <Entrance delay={0.12} className="le-hero-equipment">
              <div className="le-orbit le-orbit-one" />
              <div className="le-orbit le-orbit-two" />
              <span className="le-hero-model" aria-hidden>
                AR–100
              </span>
              <div className="le-machine-photo">
                <Image
                  src={machine?.images[0] || "/catalogo/ar-100.webp"}
                  alt="Perfuratriz AR-100 fabricada pela L&E Torneadora"
                  fill
                  loading="eager"
                  sizes="(max-width:767px) calc(100vw - 36px), (max-width:1100px) 48vw, 700px"
                  className="object-contain"
                />
              </div>
              <div className="le-floating-spec">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-le-tint text-le-blue">
                  <Gauge size={19} />
                </span>
                <div>
                  <span className="block text-[11px] uppercase tracking-widest text-le-muted">
                    Torque de trabalho
                  </span>
                  <strong className="font-heading text-lg text-le-ink">
                    1.500 <span className="text-xs font-medium">N·m</span>
                  </strong>
                </div>
              </div>
              <Link href="/vitrine/ar-100" className="le-hero-product-link">
                <span>
                  <span className="block text-[11px] uppercase tracking-[.2em] text-le-muted">
                    Conheça a máquina
                  </span>
                  <strong className="mt-1 block font-heading text-sm">
                    Perfuratriz AR-100
                  </strong>
                </span>
                <span className="le-card-arrow">
                  <ArrowUpRight size={17} />
                </span>
              </Link>
            </Entrance>
          </div>
          <div className="le-hero-bottom">
            <span>ENGENHARIA QUE TRABALHA COM VOCÊ</span>
            <a href="#equipamentos" aria-label="Explorar linhas de produtos">
              <ArrowDown size={17} />
            </a>
            <span>01 / EXPLORE A L&E</span>
          </div>
        </div>
      </section>
      <section className="le-proof-band">
        <div className="le-container grid grid-cols-2 gap-6 md:grid-cols-4">
          {[
            {
              icon: Cog,
              title: "Fabricação própria",
              text: "Tornearia e usinagem CNC",
            },
            {
              icon: Layers3,
              title: "Da máquina à ferramenta",
              text: "Uma linha completa para sua operação",
            },
            {
              icon: Gauge,
              title: "Especificação técnica",
              text: "Configuração para cada aplicação",
            },
            {
              icon: MapPin,
              title: "Atendimento direto",
              text: "Fale com quem fabrica",
            },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-3">
              <Icon size={20} className="mt-1 shrink-0 text-le-yellow" />
              <div>
                <h2 className="text-xs font-medium text-white">{title}</h2>
                <p className="mt-2 text-[11px] leading-5 text-white/70">
                  {text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section id="equipamentos" className="le-section le-container">
        <Entrance className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="le-kicker">Do primeiro metro ao próximo projeto</p>
            <h2 className="le-section-title mt-4">
              Construídos para
              <br />
              <span className="text-le-muted">trabalhar de verdade.</span>
            </h2>
          </div>
          <Link href="/vitrine" className="le-text-link">
            Toda a linha de produtos <ArrowUpRight size={17} />
          </Link>
        </Entrance>
        <FeaturedShowcase products={featured} />
      </section>
      <section className="le-container pb-24">
        <Entrance className="le-engineering-panel">
          <div className="relative min-h-[360px] overflow-hidden rounded-2xl bg-white p-8 lg:min-h-[490px]">
            <span className="absolute left-6 top-6 z-10 rounded-full bg-le-subtle px-3 py-2 text-[11px] font-medium">
              ENGENHARIA EM CADA DETALHE
            </span>
            <Image
              src="/brand/sobre-precisao-v2.webp"
              alt="Ilustração de conexões usinadas e ferramentas de medição em uma oficina"
              fill
              sizes="(max-width:767px) calc(100vw - 164px), (max-width:1100px) 40vw, 500px"
              className="object-cover"
            />
            <span className="absolute bottom-6 left-6 rounded-md bg-le-ink px-3 py-2 text-[11px] text-white">
              Imagem ilustrativa gerada por IA
            </span>
          </div>
          <div className="flex flex-col justify-center px-2 py-5 lg:px-10">
            <p className="le-kicker text-[#aab9ff]">
              A força está nos detalhes
            </p>
            <h2 className="le-section-title mt-5 text-white">
              Quem fabrica,
              <br />
              entende o caminho.
            </h2>
            <p className="mt-6 max-w-md text-sm leading-7 text-white/70">
              Uma conexão precisa. O torque certo. O material adequado. É assim
              que transformamos conhecimento em equipamentos para o dia a dia da
              perfuração.
            </p>
            <div className="my-8 space-y-3">
              {[
                "Conexões API usinadas em tornos CNC",
                "Ponteiras em aço 1045 com têmpera a óleo",
                "Cabeçotes para diferentes configurações de trabalho",
              ].map((s) => (
                <p
                  key={s}
                  className="flex items-center gap-3 text-xs text-white/70"
                >
                  <Check size={15} className="text-le-yellow" />
                  {s}
                </p>
              ))}
            </div>
            <Link href="/sobre" className="le-text-link text-white">
              Conheça a L&E Torneadora <ArrowUpRight size={17} />
            </Link>
          </div>
        </Entrance>
      </section>
      <section className="border-y border-le-line bg-white">
        <div className="le-container le-section">
          <p className="le-kicker">Simples, do início ao fim</p>
          <h2 className="le-section-title mt-4">
            Seu próximo equipamento
            <br />
            começa com uma conversa.
          </h2>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {[
              [
                "01",
                "Explore a linha",
                "Navegue pelas categorias e conheça as fichas técnicas.",
              ],
              [
                "02",
                "Encontre a configuração",
                "Conte para nossa equipe o que sua operação precisa.",
              ],
              [
                "03",
                "Receba sua cotação",
                "Alinhe fabricação, condições e fornecimento diretamente com a L&E.",
              ],
            ].map(([n, t, d]) => (
              <Entrance key={n} className="border-t border-le-line pt-6">
                <span className="font-mono text-xs text-le-blue">/{n}</span>
                <h3 className="mt-6 font-heading text-xl font-medium tracking-tight">
                  {t}
                </h3>
                <p className="mt-3 max-w-xs text-sm leading-7 text-le-muted">
                  {d}
                </p>
              </Entrance>
            ))}
          </div>
        </div>
      </section>
      <section className="le-container py-20">
        <Entrance className="le-final-cta">
          <div>
            <p className="le-kicker">Vamos mais fundo, juntos.</p>
            <h2 className="le-section-title mt-4">
              Sua operação.
              <br />
              Nossa próxima solução.
            </h2>
          </div>
          <div className="max-w-sm">
            <p className="mb-6 text-sm leading-7 text-le-muted">
              Máquinas, componentes ou uma necessidade específica. A conversa
              começa com a nossa equipe.
            </p>
            <a
              href={buildWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "primary", size: "lg" })}
            >
              Conversar sobre meu projeto <MoveRight size={17} />
            </a>
          </div>
        </Entrance>
      </section>
    </>
  );
}
