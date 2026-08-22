import type { Metadata } from 'next';
import { getCachedServices, getCachedSiteContent } from '@/lib/cache';
import { DEFAULT_SERVICOS, type ServicosContent } from '@/lib/site-content';
import { PageHero } from '@/components/public/sections/PageHero';
import { ServiceCard } from '@/components/public/sections/ServiceCard';
import { RevealGroup } from '@/components/public/RevealGroup';
import { ProcessSteps } from '@/components/public/sections/ProcessSteps';
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
            <RevealGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((s) => (
                <ServiceCard key={s.id} title={s.title} description={s.description} icon={s.icon} />
              ))}
            </RevealGroup>
          </div>
        </section>
      )}

      {/* Processo */}
      <ProcessSteps steps={c.steps} className="bg-muted/50" />

      <CTASection
        title="Precisa de um equipamento sob medida?"
        subtitle="Fabricamos conforme a sua necessidade. Fale com a nossa equipe técnica."
        buttonLabel="Solicitar orçamento"
      />
    </div>
  );
}
