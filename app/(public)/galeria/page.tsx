import type { Metadata } from 'next';
import { ImageOff } from 'lucide-react';
import { getCachedGalleryItems } from '@/lib/cache';
import { PageHero } from '@/components/public/sections/PageHero';
import { GalleryGrid } from '@/components/public/GalleryGrid';
import { CTASection } from '@/components/public/sections/CTASection';

export const metadata: Metadata = {
  title: 'Galeria',
  description: 'Projetos, equipamentos e obras realizadas pela LE Torneadora.',
};

export default async function GaleriaPage() {
  const items = await getCachedGalleryItems().catch(() => []);

  return (
    <div className="flex flex-col">
      <PageHero
        eyebrow="Galeria"
        title="Projetos e equipamentos"
        subtitle="Conheça parte do que fabricamos e das obras que nossos equipamentos viabilizam."
      />

      <section className="section px-4">
        <div className="container mx-auto">
          {items.length > 0 ? (
            <GalleryGrid items={items} />
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-20 text-center text-muted-foreground">
              <ImageOff className="h-10 w-10 opacity-40" />
              <p className="text-sm">Em breve novas fotos da nossa galeria.</p>
            </div>
          )}
        </div>
      </section>

      <CTASection
        title="Quer um equipamento como esses?"
        subtitle="Fabricamos sob medida para a sua operação de perfuração."
      />
    </div>
  );
}
