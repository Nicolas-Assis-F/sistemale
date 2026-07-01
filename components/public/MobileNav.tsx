'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { Menu, X, MessageCircle } from 'lucide-react';
import { NAV_LINKS } from '@/lib/site-content';
import { buttonVariants } from '@/components/ui/button';
import { Brand } from '@/components/Brand';
import { SearchBar } from './SearchBar';

interface Props {
  categories: { id: string; slug: string; name: string }[];
  phone?: string;
}

export function MobileNav({ categories, phone }: Props) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger
        className={buttonVariants({ variant: 'ghost', size: 'icon' }) + ' lg:hidden'}
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/40 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 lg:hidden" />
        <DialogPrimitive.Popup className="fixed inset-y-0 right-0 z-50 flex w-80 max-w-[85vw] flex-col bg-background shadow-raised outline-none data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right lg:hidden">
          <div className="flex items-center justify-between border-b border-border px-4 h-16">
            <Brand />
            <DialogPrimitive.Close
              className={buttonVariants({ variant: 'ghost', size: 'icon' })}
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>

          <div className="flex flex-col gap-1 overflow-y-auto p-4">
            <SearchBar />

            <nav className="mt-4 flex flex-col">
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={close}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-primary/8 hover:text-primary transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </nav>

            {categories.length > 0 && (
              <div className="mt-4">
                <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Categorias
                </p>
                <nav className="flex flex-col">
                  {categories.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/categoria/${cat.slug}`}
                      onClick={close}
                      className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-primary/8 hover:text-primary transition-colors"
                    >
                      {cat.name}
                    </Link>
                  ))}
                </nav>
              </div>
            )}
          </div>

          {phone && (
            <div className="mt-auto border-t border-border p-4">
              <a
                href={`https://wa.me/${phone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-700"
              >
                <MessageCircle className="h-4 w-4" />
                Falar no WhatsApp
              </a>
            </div>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
