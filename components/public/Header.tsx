import Link from 'next/link';
import { MessageCircle, Search } from 'lucide-react';
import { getCachedNavCategories } from '@/lib/cache';
import { NAV_LINKS } from '@/lib/site-content';
import { buttonVariants } from '@/components/ui/button';
import { Brand } from '@/components/Brand';
import { SearchBar } from './SearchBar';
import { MobileNav } from './MobileNav';

const phone = process.env.NEXT_PUBLIC_COMPANY_PHONE ?? '';

export async function Header() {
  const categories = await getCachedNavCategories().catch(() => []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-white/90 supports-backdrop-filter:backdrop-blur-md shadow-card">
      <div className="container mx-auto flex h-16 items-center gap-4 px-4">
        {/* Marca */}
        <Brand href="/" priority />

        {/* Nav institucional (desktop) */}
        <nav className="hidden flex-1 items-center justify-center gap-0.5 lg:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-primary/8 hover:text-primary"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Busca (desktop) */}
        <div className="hidden lg:block lg:w-56 xl:w-72">
          <SearchBar />
        </div>

        {/* Empurra as ações para a direita no mobile/tablet */}
        <div className="flex-1 lg:hidden" />

        {/* WhatsApp rápido (desktop) */}
        {phone && (
          <a
            href={`https://wa.me/${phone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden shrink-0 items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-green-700 lg:flex"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="hidden xl:inline">WhatsApp</span>
          </a>
        )}

        {/* Busca (mobile/tablet) */}
        <Link
          href="/busca"
          aria-label="Buscar produtos"
          className={buttonVariants({ variant: 'ghost', size: 'icon' }) + ' lg:hidden'}
        >
          <Search className="h-5 w-5" />
        </Link>

        {/* Menu mobile/tablet */}
        <MobileNav categories={categories} phone={phone} />
      </div>
    </header>
  );
}
