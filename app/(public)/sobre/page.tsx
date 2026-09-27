import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Entrance } from "@/components/public/Entrance";
export const metadata = { title: "A L&E Torneadora" };
export default function AboutPage() {
  return (
    <div className="le-container le-section">
      <Entrance className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <p className="le-kicker">A L&E Torneadora</p>
          <h1 className="le-title mt-5">
            Precisão de fábrica.
            <br />
            <span className="text-primary">Força em campo.</span>
          </h1>
          <p className="mt-7 text-sm leading-8 text-muted-foreground">
            De Aparecida de Goiânia, a L&E Torneadora fabrica equipamentos e
            componentes para perfuração de poços artesianos. Nossa linha reúne
            máquinas, cabeçotes hidráulicos, hastes, conexões, pistões, martelos
            e brocas.
          </p>
          <p className="mt-4 text-sm leading-8 text-muted-foreground">
            Usinagem CNC, conexões API e configurações específicas para cada
            aplicação. A escolha do equipamento começa com uma conversa técnica
            sobre a sua operação.
          </p>
          <Link href="/vitrine" className="le-button le-button-blue mt-8">
            Conheça nossos produtos <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="relative aspect-square overflow-hidden rounded-3xl border bg-white">
          <Image
            src="/catalogo/ar-100-transporte.webp"
            alt="Perfuratriz AR-100 em configuração de transporte"
            fill
            className="object-contain p-8"
            sizes="(max-width:768px) 90vw,50vw"
          />
        </div>
      </Entrance>
      <div className="mt-20 grid gap-6 md:grid-cols-3">
        {[
          [
            "01",
            "Conhecimento técnico",
            "Do motor hidráulico à conexão da haste, cada especificação importa.",
          ],
          [
            "02",
            "Produção especializada",
            "Ponteiras em aço 1045, usinagem em tornos CNC e tratamento por têmpera a óleo.",
          ],
          [
            "03",
            "Atendimento direto",
            "Conte com a equipe da L&E para definir produtos, configurações e condições de fornecimento.",
          ],
        ].map(([n, t, d]) => (
          <Entrance key={n} className="rounded-2xl border bg-white p-8">
            <span className="text-xs text-primary">/{n}</span>
            <h2 className="mt-6 font-heading text-xl">{t}</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">{d}</p>
          </Entrance>
        ))}
      </div>
    </div>
  );
}
