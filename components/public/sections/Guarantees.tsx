import { SectionHeading } from './SectionHeading';
import { resolveIcon } from './icon-map';

interface Props {
  items: { icon?: string; title: string; description: string }[];
}

/** Faixa de certificações / garantia — reforça confiança comercial. */
export function Guarantees({ items }: Props) {
  if (!items || items.length === 0) return null;

  return (
    <section className="section bg-muted/50 px-4">
      <div className="container mx-auto">
        <SectionHeading eyebrow="Garantia & qualidade" title="Por que comprar da LE Torneadora" align="center" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it) => {
            const Icon = resolveIcon(it.icon);
            return (
              <div
                key={it.title}
                className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center shadow-card transition-shadow hover:shadow-raised"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-accent/12 text-brand-accent">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-semibold">{it.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{it.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
