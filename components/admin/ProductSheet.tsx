'use client';

import { useCallback, useRef, useState, type ComponentProps } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Boxes } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ProductForm } from './ProductForm';
import { toast } from './toast';

type FormProps = ComponentProps<typeof ProductForm>;

interface Props {
  mode: 'new' | 'edit';
  /** URL da listagem sem o parâmetro do painel (preserva busca, filtros e página). */
  closeHref: string;
  categories: FormProps['categories'];
  defaultValues?: FormProps['defaultValues'];
  action: FormProps['action'];
  productId?: string;
  productSlug?: string;
  partCount?: number;
}

/**
 * Slide-over de criação/edição de produto sobre a listagem. O estado vive na URL
 * (?novo=1 / ?editar=<id>): recarregar ou compartilhar o link reabre o painel.
 * Fecha com animação antes de limpar a URL.
 */
export function ProductSheet({ mode, closeHref, categories, defaultValues, action, productId, productSlug, partCount = 0 }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const dirty = useRef(false);
  const saved = useRef(false);

  const requestClose = useCallback(() => {
    if (dirty.current && !saved.current && !window.confirm('Descartar as alterações não salvas?')) return;
    setOpen(false);
  }, []);

  const onDirtyChange = useCallback((d: boolean) => { dirty.current = d; }, []);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => { if (!next) requestClose(); }}
      onOpenChangeComplete={(isOpen) => { if (!isOpen) router.replace(closeHref, { scroll: false }); }}
    >
      <SheetContent>
        <SheetHeader>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-le-blue">
            {mode === 'new' ? 'Catálogo / nova ficha' : 'Catálogo / edição rápida'}
          </p>
          <SheetTitle className="mt-1">{mode === 'new' ? 'Novo produto' : (defaultValues?.name ?? 'Editar produto')}</SheetTitle>
          <SheetDescription>
            {mode === 'new'
              ? 'Preencha o essencial — você pode completar a ficha depois.'
              : 'As alterações são publicadas na vitrine ao salvar.'}
          </SheetDescription>
          {mode === 'edit' && productId && (
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              <Link
                href={`/admin/produtos/${productId}?tab=pecas`}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-muted-foreground transition-colors hover:border-le-blue-border hover:text-le-blue"
              >
                <Boxes className="h-3 w-3" /> Peças e componentes{partCount ? ` · ${partCount}` : ''}
              </Link>
              {productSlug && (
                <a
                  href={`/vitrine/${productSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-muted-foreground transition-colors hover:border-le-blue-border hover:text-le-blue"
                >
                  Ver na vitrine <ArrowUpRight className="h-3 w-3" />
                </a>
              )}
            </div>
          )}
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <ProductForm
            variant="sheet"
            categories={categories}
            defaultValues={defaultValues}
            action={action}
            submitLabel={mode === 'new' ? 'Criar produto' : 'Salvar alterações'}
            onDirtyChange={onDirtyChange}
            onCancel={requestClose}
            onSuccess={() => {
              saved.current = true;
              toast(mode === 'new' ? 'Produto criado e publicado' : 'Alterações salvas');
              setOpen(false);
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
