import { Quote } from 'lucide-react';
import { SectionHeading } from './SectionHeading';

interface Props {
  testimonials: { quote: string; name: string; role?: string }[];
}

/** Depoimentos de clientes. Some quando não há itens cadastrados. */
export function Testimonials({ testimonials }: Props) {
  if (!testimonials || testimonials.length === 0) return null;

  return (
    <section className="section px-4">
      <div className="container mx-auto">
        <SectionHeading eyebrow="Quem já comprou" title="O que dizem nossos clientes" align="center" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <figure
              key={i}
              className="group relative flex flex-col gap-4 overflow-hidden rounded-xl border border-border/80 bg-card p-6 shadow-sharp transition-colors hover:border-primary/40"
            >
              <span className="card-accent-top" aria-hidden />
              <Quote className="h-7 w-7 shrink-0 text-orange" aria-hidden />
              <blockquote className="flex-1 text-sm leading-relaxed text-foreground/90">
                “{t.quote}”
              </blockquote>
              <figcaption className="mt-auto border-t border-border/60 pt-4">
                <p className="text-sm font-semibold">{t.name}</p>
                {t.role && <p className="text-xs text-muted-foreground">{t.role}</p>}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
