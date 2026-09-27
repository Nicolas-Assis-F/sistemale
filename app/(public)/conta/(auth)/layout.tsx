import type { Metadata } from 'next';
import { Check } from 'lucide-react';

export const metadata: Metadata = { robots: { index: false, follow: false } };

const PERKS = ['Acompanhe pedidos e fabricação em tempo real', 'Pague por PIX, boleto ou cartão com segurança', 'Solicite orçamentos com um clique na vitrine'];

/** Shell das telas de acesso do cliente: formulário + coluna de benefícios. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="le-container grid gap-10 py-12 lg:grid-cols-[1fr_minmax(0,440px)] lg:items-center lg:gap-20 lg:py-20">
      <aside className="hidden lg:block">
        <p className="le-kicker">Área do cliente</p>
        <h2 className="le-section-title mt-4">
          Seu pedido,
          <br />
          <span className="text-le-muted">do orçamento à entrega.</span>
        </h2>
        <ul className="mt-8 space-y-3">
          {PERKS.map((p) => (
            <li key={p} className="flex items-center gap-3 text-sm text-le-text">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-le-tint text-le-blue"><Check className="h-3.5 w-3.5" /></span>
              {p}
            </li>
          ))}
        </ul>
      </aside>
      <div className="rounded-3xl border border-le-line bg-white p-6 shadow-[0_24px_60px_-30px_rgb(11_10_59/0.35)] sm:p-9">{children}</div>
    </div>
  );
}
