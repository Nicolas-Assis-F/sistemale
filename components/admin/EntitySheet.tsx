'use client';

import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { toast } from './toast';

export const EntitySheetContext = createContext<{ saved: () => void; setDirty: (value: boolean) => void } | null>(null);

export function EntitySheet({ title, closeHref, children }: { title: string; closeHref: string; children: ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const dirty = useRef(false);
  const saved = () => { dirty.current = false; toast('Alterações salvas'); setOpen(false); };
  return (
    <Sheet open={open} onOpenChange={(next) => {
      if (!next && dirty.current && !window.confirm('Descartar as alterações não salvas?')) return;
      setOpen(next);
    }} onOpenChangeComplete={(next) => {
      if (!next) { router.replace(closeHref, { scroll: false }); router.refresh(); }
    }}>
      <SheetContent className="sm:max-w-2xl" finalFocus={() => document.querySelector<HTMLElement>('[data-entity-create]')}>
        <SheetHeader>
          <p className="le-kicker">Cadastro</p>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>Preencha os dados e salve para voltar à listagem.</SheetDescription>
        </SheetHeader>
        <EntitySheetContext.Provider value={{ saved, setDirty: (value) => { dirty.current = value; } }}>
          <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7" onChangeCapture={() => { dirty.current = true; }}>
            {children}
          </div>
        </EntitySheetContext.Provider>
      </SheetContent>
    </Sheet>
  );
}

export function useEntitySheet() { return useContext(EntitySheetContext); }
