import type { Metadata } from 'next';
import { Phone, Mail, MapPin, Clock, MessageCircle } from 'lucide-react';
import { getCachedSiteContent } from '@/lib/cache';
import { DEFAULT_CONTATO, type ContatoContent } from '@/lib/site-content';
import { PageHero } from '@/components/public/sections/PageHero';
import { ContactForm } from '@/components/public/ContactForm';

export const metadata: Metadata = {
  title: 'Contato',
  description: 'Fale com a LE Torneadora — orçamentos, suporte técnico e atendimento.',
};

export default async function ContatoPage() {
  const row = await getCachedSiteContent('contato').catch(() => null);
  const c = { ...DEFAULT_CONTATO, ...((row?.value as Partial<ContatoContent>) ?? {}) };

  const phone = process.env.NEXT_PUBLIC_COMPANY_PHONE ?? '';
  const email = process.env.NEXT_PUBLIC_COMPANY_EMAIL ?? '';
  const address = 'R X 13 SN, Q.12, Bairro American Park, Aparecida de Goiânia – GO, CEP 74953-140';
  const mapsSrc = `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;

  return (
    <div className="flex flex-col">
      <PageHero eyebrow={c.heroEyebrow} title={c.heroTitle} subtitle={c.heroSubtitle} />

      <section className="section px-4">
        <div className="container mx-auto grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Formulário */}
          <div>
            <ContactForm />
          </div>

          {/* Info + mapa */}
          <div className="space-y-5">
            <ul className="space-y-4">
              {phone && (
                <li className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Phone className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Telefone / WhatsApp</p>
                    <a href={`tel:+${phone}`} className="text-sm text-muted-foreground hover:text-primary">+{phone}</a>
                  </div>
                </li>
              )}
              {email && (
                <li className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Mail className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">E-mail</p>
                    <a href={`mailto:${email}`} className="text-sm text-muted-foreground hover:text-primary">{email}</a>
                  </div>
                </li>
              )}
              <li className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <MapPin className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Endereço</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{address}</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Clock className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Horário</p>
                  <p className="text-sm text-muted-foreground">{c.hours}</p>
                </div>
              </li>
            </ul>

            {phone && (
              <a
                href={`https://wa.me/${phone}?text=${encodeURIComponent('Olá Vim do site e gostaria de mais informações.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700"
              >
                <MessageCircle className="h-4 w-4" />
                Falar no WhatsApp
              </a>
            )}

            <div className="overflow-hidden rounded-2xl border border-border/80 shadow-sharp">
              <iframe
                title="Localização LE Torneadora"
                src={mapsSrc}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-72 w-full border-0"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
