import { SectionHeading } from './SectionHeading';
import { resolveIcon } from './icon-map';
import { IconBadge } from '../IconBadge';
import { RevealGroup } from '../RevealGroup';

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
        <RevealGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it) => {
            const Icon = resolveIcon(it.icon);
            return (
              <div
                key={it.title}
                className="group flex h-full flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center shadow-card transition-shadow hover:shadow-raised"
              >
                <IconBadge icon={Icon} />
                <h3 className="text-sm font-semibold">{it.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{it.description}</p>
              </div>
            );
          })}
        </RevealGroup>
      </div>
    </section>
  );
}
