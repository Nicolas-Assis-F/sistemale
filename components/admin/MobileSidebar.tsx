'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { Menu, X } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { AdminNav } from './AdminNav';

export function MobileSidebar({ unreadCount = 0 }: { unreadCount?: number }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Fecha o drawer ao trocar de rota
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger
        className={buttonVariants({ variant: 'ghost', size: 'icon' }) + ' md:hidden'}
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/50 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 md:hidden" />
        <DialogPrimitive.Popup className="fixed inset-y-0 left-0 z-50 flex w-64 max-w-[85vw] flex-col bg-sidebar outline-none data-open:animate-in data-open:slide-in-from-left data-closed:animate-out data-closed:slide-out-to-left md:hidden">
          <div className="flex items-center justify-between border-b border-sidebar-border p-5">
            <Image
              src="/LOGO.png"
              alt="LE Torneadora"
              width={120}
              height={36}
              className="h-7 w-auto object-contain brightness-0 invert"
            />
            <DialogPrimitive.Close aria-label="Fechar" className="text-sidebar-foreground/60 hover:text-sidebar-foreground">
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>
          <AdminNav unreadCount={unreadCount} onNavigate={() => setOpen(false)} />
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
