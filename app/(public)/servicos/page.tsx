import type { Metadata } from 'next';
import { getCachedServices, getCachedSiteContent } from '@/lib/cache';
import { DEFAULT_SERVICOS, type ServicosContent } from '@/lib/site-content';
import { PageHero } from '@/components/public/sections/PageHero';
import { SectionHeading } from '@/components/public/sections/SectionHeading';
import { ServiceCard } from '@/components/public/sections/ServiceCard';
import { CTASection } from '@/components/public/sections/CTASection';

export const metadata: Metadata = {
  title: 'Serviços',
  description: 'Fabricação de máquinas de perfuração, cabeçote hidráulico, roscas, hastes e suporte técnico para poços artesianos.',
};

export default async function ServicosPage() {
  const [services, row] = await Promise.all([
    getCachedServices().catch(() => []),
    getCachedSiteContent('servicos').catch(() => null),
  ]);
  const c = { ...DEFAULT_SERVICOS, ...((row?.value as Partial<ServicosContent>) ?? {}) };

  return (
    <div className="flex flex-col">
      <PageHero eyebrow={c.heroEyebrow} title={c.heroTitle} subtitle={c.heroSubtitle} />

      {/* Serviços */}
      {services.length > 0 && (
        <section className="section px-4">
          <div className="container mx-auto">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((s) => (
                <ServiceCard key={s.id} title={s.title} description={s.description} icon={s.icon} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Processo */}
      {c.steps.length > 0 && (
        <section className="section bg-muted/50 px-4">
          <div className="container mx-auto">
            <SectionHeading eyebrow="Como trabalhamos" title="Do diagnóstico à entrega" align="center" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {c.steps.map((step, i) => (
                <div key={step.title} className="relative rounded-2xl border border-border bg-card p-6 shadow-card">
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
      )}

      <CTASection
        title="Precisa de um equipamento sob medida?"
        subtitle="Fabricamos conforme a sua necessidade. Fale com a nossa equipe técnica."
        buttonLabel="Solicitar orçamento"
      />
    </div>
  );
}
