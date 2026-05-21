import Image from 'next/image';
import Link from 'next/link';
import { Phone, Mail, MapPin, MessageCircle, Building2 } from 'lucide-react';

export function Footer() {
  const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME ?? 'L & E Torneadora';
  const phone = process.env.NEXT_PUBLIC_COMPANY_PHONE ?? '';
  const email = process.env.NEXT_PUBLIC_COMPANY_EMAIL ?? '';
  const address = process.env.NEXT_PUBLIC_COMPANY_ADDRESS ?? '';
  const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent('Olá! Vim do site e gostaria de mais informações.')}`;

  return (
    <footer className="bg-primary text-primary-foreground mt-auto">
      <div className="container mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-3 gap-10">
        {/* Coluna 1 — Marca */}
        <div className="space-y-4">
          <Image
            src="/LOGO.png"
            alt={companyName}
            width={140}
            height={42}
            className="h-10 w-auto object-contain brightness-0 invert"
          />
          <p className="text-sm text-primary-foreground/70 leading-relaxed">
            Fabricamos todos os equipamentos para poços artesianos — máquinas de 40m a 100m,
            cabeçote hidráulico, roscas e hastes de perfuração.
          </p>
          <div className="flex items-start gap-2 text-xs text-primary-foreground/50">
            <Building2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>CNPJ 44.492.124/0001-07 · Fundada em 2021</span>
          </div>
        </div>

        {/* Coluna 2 — Contato */}
        <div>
          <h4 className="font-semibold mb-4 text-primary-foreground/90">Contato</h4>
          <ul className="space-y-3 text-sm">
            {phone && (
              <li className="flex items-center gap-2 text-primary-foreground/70">
                <Phone className="h-4 w-4 shrink-0" />
                <a href={`tel:+${phone}`} className="hover:text-primary-foreground transition-colors">
                  +{phone}
                </a>
              </li>
            )}
            {email && (
              <li className="flex items-center gap-2 text-primary-foreground/70">
                <Mail className="h-4 w-4 shrink-0" />
                <a href={`mailto:${email}`} className="hover:text-primary-foreground transition-colors">
                  {email}
                </a>
              </li>
            )}
            {address && (
              <li className="flex items-start gap-2 text-primary-foreground/70">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{address}</span>
              </li>
            )}
          </ul>
        </div>

        {/* Coluna 3 — WhatsApp */}
        <div>
          <h4 className="font-semibold mb-4 text-primary-foreground/90">Atendimento</h4>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm shadow-sm"
          >
            <MessageCircle className="h-4 w-4" />
            Falar no WhatsApp
          </a>
          <p className="mt-3 text-xs text-primary-foreground/50">Seg–Sex, 8h às 18h</p>
          <p className="mt-4 text-xs text-primary-foreground/50 leading-relaxed">
            R X 13 SN, Q.12, Bairro American Park<br />
            Aparecida de Goiânia – GO, CEP 74953-140
          </p>
        </div>
      </div>

      <div className="border-t border-primary-foreground/10">
        <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-primary-foreground/40">
          <p>© {new Date().getFullYear()} L E TORNEADORA LTDA - ME. Todos os direitos reservados.</p>
          <Link href="/admin" className="hover:text-primary-foreground/70 transition-colors">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
