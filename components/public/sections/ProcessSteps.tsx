import { cn } from '@/lib/utils';
import { SectionHeading } from './SectionHeading';

interface Props {
  steps: { title: string; description: string }[];
  eyebrow?: string;
  title?: string;
  className?: string;
}

/** Faixa "Como trabalhamos" — passos numerados. Reutilizada na home e em /servicos. */
export function ProcessSteps({
  steps,
  eyebrow = 'Como trabalhamos',
  title = 'Do diagnóstico à entrega',
  className,
}: Props) {
  if (steps.length === 0) return null;

  return (
    <section className={cn('section px-4', className)}>
      <div className="container mx-auto">
        <SectionHeading eyebrow={eyebrow} title={title} align="center" />
        <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Linha conectora (desktop) */}
          <div className="pointer-events-none absolute inset-x-8 top-11 hidden h-px bg-linear-to-r from-border via-border to-transparent lg:block" aria-hidden />
          {steps.map((step, i) => (
            <div
              key={step.title}
              className="group relative overflow-hidden rounded-xl border border-border/80 bg-card p-6 shadow-sharp transition-colors hover:border-primary/40"
            >
              <span className="card-accent-top" aria-hidden />
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-orange/25 bg-orange/10 font-heading text-base font-bold text-orange">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="h-px flex-1 bg-border" aria-hidden />
              </div>
              <h3 className="mb-1.5 text-base font-semibold">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
