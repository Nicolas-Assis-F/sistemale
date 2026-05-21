import Image from 'next/image';
import Link from 'next/link';
import { Menu, MessageCircle } from 'lucide-react';
import { getCachedNavCategories } from '@/lib/cache';
import { SearchBar } from './SearchBar';
import { buttonVariants } from '@/components/ui/button';

const phone = process.env.NEXT_PUBLIC_COMPANY_PHONE ?? '';

export async function Header() {
  const categories = await getCachedNavCategories().catch(() => []);

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-primary/20 shadow-sm">
      <div className="container mx-auto px-4 flex h-16 items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center shrink-0">
          <Image
            src="/LOGO.png"
            alt="L & E Torneadora"
            width={160}
            height={48}
            className="h-10 w-auto object-contain"
            priority
          />
        </Link>

        {/* Nav categorias */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/categoria/${cat.slug}`}
              className="text-sm font-medium px-3 py-2 rounded-md hover:bg-primary/8 hover:text-primary transition-colors"
            >
              {cat.name}
            </Link>
          ))}
        </nav>

        {/* Search */}
        <div className="flex-1 md:flex-none md:w-64 lg:w-80">
          <SearchBar />
        </div>

        {/* WhatsApp rápido */}
        {phone && (
          <a
            href={`https://wa.me/${phone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors shrink-0"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="hidden lg:inline">WhatsApp</span>
          </a>
        )}

        {/* Mobile menu */}
        <button type="button" aria-label="Abrir menu" className={buttonVariants({ variant: 'ghost', size: 'icon' }) + ' md:hidden'}>
          <Menu className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
