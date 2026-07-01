import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
});

// Fonte de destaque (títulos) — técnica e moderna, combina com o tom industrial.
const spaceGrotesk = Space_Grotesk({
  variable: '--font-display',
  subsets: ['latin'],
  display: 'swap',
  weight: ['500', '600', '700'],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME ?? 'Catálogo';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${companyName} — Equipamentos para Poços Artesianos`,
    template: `%s | ${companyName}`,
  },
  description:
    'L & E Torneadora — Fabricamos todos os equipamentos para poços artesianos: máquinas de 40m a 100m, cabeçote hidráulico, roscas e hastes de perfuração. Aparecida de Goiânia – GO.',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'L & E Torneadora',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}
