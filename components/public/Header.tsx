"use client";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, Menu } from "lucide-react";
import { Brand } from "@/components/Brand";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { buildWhatsAppUrl } from "@/lib/whatsapp-url";
import { AccountButton } from "@/components/account/AccountButton";
const links = [
  { href: "/", label: "Início" },
  { href: "/vitrine", label: "Vitrine" },
  { href: "/sobre", label: "A L&E" },
  { href: "/servicos", label: "Soluções" },
];
export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="le-header">
      <div className="le-container flex h-22 items-center justify-between gap-5">
        <Brand href="/" />
        <nav
          aria-label="Navegação principal"
          className="hidden items-center gap-8 lg:flex"
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={
                (
                  l.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(l.href)
                )
                  ? "page"
                  : undefined
              }
              className="le-nav-link"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <AccountButton className="hidden sm:inline-flex" />
          <span className="hidden sm:block">
            <a
              href={buildWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "dark", size: "lg" })}
            >
              Fale com a L&E <ArrowUpRight size={16} />
            </a>
          </span>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              aria-label="Abrir navegação"
              className="rounded-xl border p-3 lg:hidden"
            >
              <Menu size={20} />
            </DialogTrigger>
            <DialogContent className="p-7">
              <DialogTitle>Navegar pela L&E</DialogTitle>
              <nav aria-label="Navegação mobile" className="mt-3 flex flex-col gap-2">
                {links.map((l) => (
                  <Link
                    key={l.href}
                    onClick={() => setOpen(false)}
                    href={l.href}
                    aria-current={(l.href === '/' ? pathname === '/' : pathname.startsWith(l.href)) ? 'page' : undefined}
                    className="rounded-xl p-3 text-lg hover:bg-muted"
                  >
                    {l.label}
                  </Link>
                ))}
                <Link
                  href="/conta"
                  onClick={() => setOpen(false)}
                  className="rounded-xl p-3 text-lg hover:bg-muted"
                >
                  Minha conta
                </Link>
                <Link
                  href="/contato"
                  onClick={() => setOpen(false)}
                  className="le-button le-button-blue mt-3"
                >
                  Solicitar orçamento
                </Link>
              </nav>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
}
