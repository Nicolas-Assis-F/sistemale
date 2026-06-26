import type { Metadata } from 'next';
import ReactMarkdown from 'react-markdown';
import { getCachedSiteContent } from '@/lib/cache';
import { DEFAULT_SOBRE, type SobreContent } from '@/lib/site-content';
import { PageHero } from '@/components/public/sections/PageHero';
import { StatBand } from '@/components/public/sections/StatBand';
import { CTASection } from '@/components/public/sections/CTASection';
import { CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'A Empresa',
  description: 'Conheça a LE Torneadora — fabricação de equipamentos para perfuração de poços artesianos.',
};

export default async function SobrePage() {
  const row = await getCachedSiteContent('sobre').catch(() => null);
  const c = { ...DEFAULT_SOBRE, ...((row?.value as Partial<SobreContent>) ?? {}) };

  return (
    <div className="flex flex-col">
      <PageHero eyebrow={c.heroEyebrow} title={c.heroTitle} subtitle={c.heroSubtitle} />

      {/* História */}
      <section className="section px-4">
        <div className="container-tight">
          <article className="prose prose-neutral max-w-none prose-headings:tracking-tight prose-a:text-primary">
            <ReactMarkdown>{c.story}</ReactMarkdown>
          </article>
        </div>
      </section>

      {/* Stats */}
      {c.stats.length > 0 && (
        <section className="px-4 pb-4">
          <div className="container mx-auto">
            <StatBand stats={c.stats} />
          </div>
        </section>
      )}

      {/* Valores / diferenciais */}
      {c.values.length > 0 && (
        <section className="section px-4">
          <div className="container mx-auto">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {c.values.map((v) => (
                <div key={v.title} className="rounded-2xl border border-border bg-card p-6 shadow-card">
                  <CheckCircle2 className="mb-3 h-6 w-6 text-primary" />
                  <h3 className="mb-1.5 text-base font-semibold">{v.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{v.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <CTASection
        title="Vamos conversar sobre o seu poço?"
        subtitle="Fale com nossa equipe técnica e descubra o equipamento ideal para a sua operação."
      />
    </div>
  );
}
