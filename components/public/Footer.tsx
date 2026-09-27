import Link from "next/link";
import { ArrowUpRight, Camera, MapPin } from "lucide-react";
import { Brand } from "@/components/Brand";
import { buildWhatsAppUrl } from "@/lib/whatsapp-url";
export function Footer() {
  return (
    <footer className="le-footer">
      <div className="le-container">
        <div className="grid gap-12 border-b border-white/10 pb-14 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Brand variant="dark" />
            <p className="mt-6 max-w-xs text-sm leading-7 text-white/70">
              Da máquina à ferramenta.
              <br />
              Precisão e força para sua próxima perfuração.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-xs text-white/60">
              <MapPin size={14} /> Aparecida de Goiânia · GO
            </span>
          </div>
          <div>
            <p className="le-footer-label">Explore</p>
            <div className="grid gap-4 text-sm text-white/65">
              <Link href="/vitrine">Vitrine de produtos</Link>
              <Link href="/sobre">A L&E Torneadora</Link>
              <Link href="/servicos">Nossas soluções</Link>
              <Link href="/conta">Área do cliente</Link>
              <a
                href="/catalogo/catalogo-letorneadora.pdf"
                target="_blank"
                rel="noopener noreferrer"
              >
                Catálogo em PDF ↗
              </a>
            </div>
          </div>
          <div>
            <p className="le-footer-label">Vamos conversar</p>
            <a
              className="font-heading text-2xl tracking-tight"
              href={buildWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
            >
              (62) 98601-8386 <ArrowUpRight className="inline" size={18} />
            </a>
            <p className="mt-3 text-sm text-white/70">
              Informações técnicas e cotações.
            </p>
            <a
              href="https://www.instagram.com/letorneadora/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 text-sm text-white/70"
            >
              <Camera size={16} /> @letorneadora
            </a>
          </div>
        </div>
        <div className="flex flex-wrap justify-between gap-4 py-7 text-[11px] text-white/70">
          <span>
            © {new Date().getFullYear()} L&E Torneadora. Todos os direitos
            reservados.
          </span>
          <Link href="/admin">Acesso administrativo ↗</Link>
        </div>
      </div>
    </footer>
  );
}
