'use client';

import { useState, useTransition, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { createPurchaseList } from '@/app/admin/lista-compras/_actions';
import { formatCurrency } from '@/lib/format';
import { ShoppingCart, Save } from 'lucide-react';

type PartItem = {
  id: string;
  name: string;
  location: string | null;
  category: string;
  quantity: number;
  unitPriceCents: number;
  notes: string | null;
};

type Product = {
  id: string;
  name: string;
  sku: string;
  partItems: PartItem[];
};

export function PurchaseListBuilder({ products }: { products: Product[] }) {
  const [listName, setListName] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set());
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Items from selected products
  const visibleItems = useMemo(() => {
    const items: (PartItem & { productName: string; productSku: string })[] = [];
    for (const product of products) {
      if (!selectedProductIds.has(product.id)) continue;
      for (const item of product.partItems) {
        if (activeCategories.size > 0 && !activeCategories.has(item.category)) continue;
        items.push({ ...item, productName: product.name, productSku: product.sku });
      }
    }
    return items;
  }, [products, selectedProductIds, activeCategories]);

  // All categories across selected products
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    for (const product of products) {
      if (!selectedProductIds.has(product.id)) continue;
      for (const item of product.partItems) cats.add(item.category);
    }
    return Array.from(cats).sort();
  }, [products, selectedProductIds]);

  function toggleProduct(id: string) {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        // Deselect all items from this product
        const product = products.find((p) => p.id === id)!;
        setSelectedItemIds((items) => {
          const nextItems = new Set(items);
          product.partItems.forEach((i) => nextItems.delete(i.id));
          return nextItems;
        });
      } else {
        next.add(id);
      }
      return next;
    });
    // Reset category filter when product selection changes
    setActiveCategories(new Set());
  }

  function toggleCategory(cat: string) {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
    // Deselect items that no longer match the filter
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      for (const product of products) {
        if (!selectedProductIds.has(product.id)) continue;
        for (const item of product.partItems) {
          const newFilter = new Set(activeCategories);
          if (newFilter.has(cat)) {
            newFilter.delete(cat);
          } else {
            newFilter.add(cat);
          }
          if (newFilter.size > 0 && !newFilter.has(item.category)) {
            next.delete(item.id);
          }
        }
      }
      return next;
    });
  }

  function toggleItem(id: string) {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      visibleItems.forEach((i) => next.add(i.id));
      return next;
    });
  }

  function deselectAllVisible() {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      visibleItems.forEach((i) => next.delete(i.id));
      return next;
    });
  }

  const selectedVisibleItems = visibleItems.filter((i) => selectedItemIds.has(i.id));
  const totalCents = selectedVisibleItems.reduce(
    (sum, i) => sum + i.unitPriceCents * i.quantity,
    0,
  );
  const uncotedCount = selectedVisibleItems.filter((i) => i.unitPriceCents === 0).length;

  function onSave() {
    setError(null);
    if (!listName.trim()) {
      setError('Dê um nome para a lista.');
      return;
    }
    if (selectedItemIds.size === 0) {
      setError('Selecione pelo menos um item.');
      return;
    }
    startTransition(async () => {
      try {
        await createPurchaseList(listName, Array.from(selectedItemIds));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao salvar');
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* List name */}
      <div className="space-y-1.5 max-w-sm">
        <Label htmlFor="list-name">Nome da Lista *</Label>
        <Input
          id="list-name"
          placeholder="Ex: Borrachas – Fornecedor Vedações X"
          value={listName}
          onChange={(e) => setListName(e.target.value)}
        />
      </div>

      {/* Step 1: Select machines */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          1. Selecionar máquinas
        </h2>
        <div className="flex flex-wrap gap-2">
          {products.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => toggleProduct(product.id)}
              className={[
                'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors',
                selectedProductIds.has(product.id)
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:bg-muted text-foreground',
              ].join(' ')}
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              {product.name}
              <span className="text-xs opacity-60">({product.partItems.length})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Filter by category */}
      {selectedProductIds.size > 0 && availableCategories.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            2. Filtrar por categoria{' '}
            <span className="font-normal normal-case">(opcional — deixe vazio para ver tudo)</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {availableCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={[
                  'px-3 py-1.5 rounded-full text-sm border transition-colors',
                  activeCategories.has(cat)
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border hover:bg-muted text-foreground',
                ].join(' ')}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Select items */}
      {selectedProductIds.size > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              3. Selecionar itens
            </h2>
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={selectAllVisible}
                className="text-primary hover:underline"
              >
                Selecionar todos
              </button>
              <span className="text-muted-foreground">·</span>
              <button
                type="button"
                onClick={deselectAllVisible}
                className="text-muted-foreground hover:underline"
              >
                Desmarcar todos
              </button>
            </div>
          </div>

          {visibleItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma peça encontrada com o filtro atual.
            </p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="w-10 px-3 py-2.5" />
                    <th className="text-left px-3 py-2.5 font-medium">Componente</th>
                    <th className="text-left px-3 py-2.5 font-medium hidden lg:table-cell">Máquina</th>
                    <th className="text-left px-3 py-2.5 font-medium hidden md:table-cell">Localização</th>
                    <th className="text-left px-3 py-2.5 font-medium">Categoria</th>
                    <th className="text-right px-3 py-2.5 font-medium">Qtd</th>
                    <th className="text-right px-3 py-2.5 font-medium hidden sm:table-cell">Preço Unit.</th>
                    <th className="text-right px-3 py-2.5 font-medium hidden sm:table-cell">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {visibleItems.map((item) => {
                    const checked = selectedItemIds.has(item.id);
                    return (
                      <tr
                        key={item.id}
                        className={[
                          'transition-colors cursor-pointer',
                          checked ? 'bg-primary/5' : 'hover:bg-muted/20',
                        ].join(' ')}
                        onClick={() => toggleItem(item.id)}
                      >
                        <td className="px-3 py-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleItem(item.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 rounded border-border"
                          />
                        </td>
                        <td className="px-3 py-2.5 font-medium">{item.name}</td>
                        <td className="px-3 py-2.5 text-muted-foreground hidden lg:table-cell text-xs">
                          {item.productName}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground hidden md:table-cell">
                          {item.location || '—'}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant="secondary" className="text-xs font-normal">
                            {item.category}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{item.quantity}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums hidden sm:table-cell">
                          {item.unitPriceCents === 0 ? (
                            <span className="text-muted-foreground italic text-xs">a cotar</span>
                          ) : (
                            formatCurrency(item.unitPriceCents)
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums hidden sm:table-cell">
                          {item.unitPriceCents === 0 ? (
                            <span className="text-muted-foreground italic text-xs">—</span>
                          ) : (
                            formatCurrency(item.unitPriceCents * item.quantity)
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Footer / Save */}
      {selectedProductIds.size > 0 && (
        <div className="sticky bottom-0 bg-background border-t pt-4 pb-2 flex items-center justify-between gap-4">
          <div className="text-sm">
            {selectedItemIds.size === 0 ? (
              <span className="text-muted-foreground">Nenhum item selecionado</span>
            ) : (
              <span>
                <strong>{selectedItemIds.size}</strong>{' '}
                {selectedItemIds.size === 1 ? 'item selecionado' : 'itens selecionados'}
                {totalCents > 0 && (
                  <span className="ml-2 font-semibold tabular-nums">
                    · {formatCurrency(totalCents)}
                    {uncotedCount > 0 && (
                      <span className="text-muted-foreground font-normal ml-1 text-xs">
                        + {uncotedCount} a cotar
                      </span>
                    )}
                  </span>
                )}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="button" onClick={onSave} disabled={isPending}>
              <Save className="h-4 w-4 mr-1.5" />
              {isPending ? 'Salvando…' : 'Salvar Lista'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
