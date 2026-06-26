import { WhatsAppButton } from '@/components/public/WhatsAppButton';

interface Props {
  title: string;
  subtitle?: string;
  buttonLabel?: string;
}

export function CTASection({ title, subtitle, buttonLabel = 'Consultar via WhatsApp' }: Props) {
  return (
    <section className="section bg-primary text-primary-foreground">
      <div className="container mx-auto max-w-2xl px-4 text-center space-y-5">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h2>
        {subtitle && (
          <p className="text-primary-foreground/75 text-sm sm:text-base leading-relaxed">{subtitle}</p>
        )}
        <div className="flex justify-center pt-1">
          <WhatsAppButton className="bg-white text-primary hover:bg-white/90 font-semibold px-8 sm:w-auto">
            {buttonLabel}
          </WhatsAppButton>
        </div>
      </div>
    </section>
  );
}
