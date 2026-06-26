import { Zap, Headphones, ShieldCheck, type LucideIcon } from 'lucide-react';

const trustItems: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: Zap, title: 'Pronta Entrega', desc: 'Estoque disponível para envio imediato em todo o Brasil.' },
  { icon: Headphones, title: 'Suporte Técnico', desc: 'Equipe especializada para ajudar na escolha certa.' },
  { icon: ShieldCheck, title: 'Fabricação Própria', desc: 'Tornearia interna com controle de qualidade e precisão.' },
];

export function TrustBand() {
  return (
    <section className="py-14 px-4">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {trustItems.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="flex items-start gap-4 rounded-2xl border bg-card p-6 shadow-card transition-shadow hover:shadow-raised"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="mb-1 text-sm font-semibold">{title}</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
