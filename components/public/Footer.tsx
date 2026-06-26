import Image from 'next/image';
import Link from 'next/link';
import { Phone, Mail, MapPin, MessageCircle, Building2, Clock } from 'lucide-react';
import { getCachedNavCategories } from '@/lib/cache';
import { NAV_LINKS } from '@/lib/site-content';

export async function Footer() {
  const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME ?? 'LE Torneadora';
  const phone = process.env.NEXT_PUBLIC_COMPANY_PHONE ?? '';
  const email = process.env.NEXT_PUBLIC_COMPANY_EMAIL ?? '';
  const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent('Olá! Vim do site e gostaria de mais informações.')}`;
  const categories = await getCachedNavCategories().catch(() => []);

  return (
    <footer className="mt-auto bg-brand-900 text-white">
      <div className="container mx-auto grid grid-cols-1 gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        {/* Marca */}
        <div className="space-y-4">
          <Image
            src="/LOGO.png"
            alt={companyName}
            width={150}
            height={45}
            className="h-10 w-auto object-contain brightness-0 invert"
          />
          <p className="text-sm leading-relaxed text-white/70">
            Fabricamos todos os equipamentos para poços artesianos — máquinas de 40m a 100m,
            cabeçote hidráulico, roscas e hastes de perfuração.
          </p>
          <div className="flex items-start gap-2 text-xs text-white/50">
            <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>CNPJ 44.492.124/0001-07 · Fundada em 2021</span>
          </div>
        </div>

        {/* Institucional */}
        <div>
          <h4 className="mb-4 font-semibold text-white/90">Institucional</h4>
          <ul className="space-y-2.5 text-sm">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-white/65 transition-colors hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Catálogo */}
        <div>
          <h4 className="mb-4 font-semibold text-white/90">Catálogo</h4>
          <ul className="space-y-2.5 text-sm">
            {categories.slice(0, 6).map((cat) => (
              <li key={cat.id}>
                <Link href={`/categoria/${cat.slug}`} className="text-white/65 transition-colors hover:text-white">
                  {cat.name}
                </Link>
              </li>
            ))}
            {categories.length === 0 && (
              <li>
                <Link href="/busca" className="text-white/65 transition-colors hover:text-white">
                  Ver todos os produtos
                </Link>
              </li>
            )}
          </ul>
        </div>

        {/* Contato */}
        <div>
          <h4 className="mb-4 font-semibold text-white/90">Contato</h4>
          <ul className="space-y-3 text-sm">
            {phone && (
              <li className="flex items-center gap-2 text-white/70">
                <Phone className="h-4 w-4 shrink-0" />
                <a href={`tel:+${phone}`} className="transition-colors hover:text-white">+{phone}</a>
              </li>
            )}
            {email && (
              <li className="flex items-center gap-2 text-white/70">
                <Mail className="h-4 w-4 shrink-0" />
                <a href={`mailto:${email}`} className="transition-colors hover:text-white">{email}</a>
              </li>
            )}
            <li className="flex items-start gap-2 text-white/70">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="leading-relaxed">
                R X 13 SN, Q.12, Bairro American Park<br />
                Aparecida de Goiânia – GO, CEP 74953-140
              </span>
            </li>
            <li className="flex items-center gap-2 text-white/50">
              <Clock className="h-4 w-4 shrink-0" />
              Seg–Sex, 8h às 18h
            </li>
          </ul>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-500"
          >
            <MessageCircle className="h-4 w-4" />
            Falar no WhatsApp
          </a>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container mx-auto flex flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-white/40 sm:flex-row">
          <p>© {new Date().getFullYear()} L E TORNEADORA LTDA - ME. Todos os direitos reservados.</p>
          <Link href="/admin" className="transition-colors hover:text-white/70">Admin</Link>
        </div>
      </div>
    </footer>
  );
}
