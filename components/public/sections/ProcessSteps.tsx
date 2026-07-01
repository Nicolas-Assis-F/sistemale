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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <div
              key={step.title}
              className="relative rounded-2xl border border-border bg-card p-6 shadow-card transition-shadow hover:shadow-raised"
            >
              <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {i + 1}
              </span>
              <h3 className="mb-1.5 text-base font-semibold">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
