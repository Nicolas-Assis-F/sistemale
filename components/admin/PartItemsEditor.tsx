'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, X, Check, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { createPartItem, updatePartItem, deletePartItem } from '@/app/admin/produtos/_part-actions';

const partSchema = z.object({
  name: z.string().min(1, 'Obrigatório'),
  location: z.string().optional(),
  category: z.string().min(1, 'Obrigatório'),
  quantity: z.number().int().min(1, 'Mínimo 1'),
  unitPriceReais: z.string().optional(),
  notes: z.string().optional(),
});

type PartFormValues = z.infer<typeof partSchema>;

type PartItem = {
  id: string;
  name: string;
  location: string | null;
  category: string;
  quantity: number;
  unitPriceCents: number;
  notes: string | null;
};

function formatPrice(cents: number): string {
  if (cents === 0) return '';
  return (cents / 100).toFixed(2).replace('.', ',');
}

function displayPrice(cents: number): string {
  if (cents === 0) return '—';
  return `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

const SUGGESTED_CATEGORIES = [
  'Borracha', 'Parafuso', 'Rolamento', 'Vedação', 'Anel', 'Pino',
  'Mola', 'Engrenagem', 'Correia', 'Filtro', 'Óleo', 'Elétrico', 'Geral',
];

export function PartItemsEditor({
  productId,
  items: initialItems,
}: {
  productId: string;
  items: PartItem[];
}) {
  const [items, setItems] = useState<PartItem[]>(initialItems);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<PartFormValues>({
    resolver: zodResolver(partSchema),
    defaultValues: {
      name: '',
      location: '',
      category: 'Geral',
      quantity: 1,
      unitPriceReais: '',
      notes: '',
    },
  });

  function openAdd() {
    setEditingId(null);
    form.reset({ name: '', location: '', category: 'Geral', quantity: 1, unitPriceReais: '', notes: '' });
    setShowForm(true);
  }

  function openEdit(item: PartItem) {
    setEditingId(item.id);
    form.reset({
      name: item.name,
      location: item.location ?? '',
      category: item.category,
      quantity: item.quantity,
      unitPriceReais: formatPrice(item.unitPriceCents),
      notes: item.notes ?? '',
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    form.reset();
  }

  function onSubmit(data: PartFormValues) {
    startTransition(async () => {
      if (editingId) {
        await updatePartItem(editingId, productId, data);
        setItems((prev) =>
          prev.map((item) =>
            item.id === editingId
              ? {
                  ...item,
                  name: data.name,
                  location: data.location || null,
                  category: data.category,
                  quantity: data.quantity,
                  unitPriceCents: data.unitPriceReais
                    ? Math.round(parseFloat(data.unitPriceReais.replace(',', '.')) * 100)
                    : 0,
                  notes: data.notes || null,
                }
              : item,
          ),
        );
      } else {
        const created = await createPartItem(productId, data);
        // Optimistically add with a temp id — server revalidation will correct it
        void created;
        setItems((prev) => [
          ...prev,
          {
            id: `temp-${Date.now()}`,
            name: data.name,
            location: data.location || null,
            category: data.category,
            quantity: data.quantity,
            unitPriceCents: data.unitPriceReais
              ? Math.round(parseFloat(data.unitPriceReais.replace(',', '.')) * 100)
              : 0,
            notes: data.notes || null,
          },
        ]);
      }
      closeForm();
    });
  }

  function onDelete(item: PartItem) {
    if (!confirm(`Remover "${item.name}"?`)) return;
    startTransition(async () => {
      await deletePartItem(item.id, productId);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    });
  }

  const totalCents = items.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0);
  const uncotedCount = items.filter((i) => i.unitPriceCents === 0).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length === 0
            ? 'Nenhuma peça cadastrada ainda.'
            : `${items.length} ${items.length === 1 ? 'peça' : 'peças'} cadastradas`}
        </p>
        {!showForm && (
          <Button type="button" size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1.5" />
            Adicionar Peça
          </Button>
        )}
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="border rounded-lg p-4 bg-card space-y-4">
          <h3 className="font-semibold text-sm">
            {editingId ? 'Editar Peça' : 'Nova Peça'}
          </h3>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="part-name">Nome do componente *</Label>
                <Input
                  id="part-name"
                  placeholder="Ex: Parafuso M4 × 20mm"
                  {...form.register('name')}
                />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="part-location">Localização / Posição</Label>
                <Input
                  id="part-location"
                  placeholder="Ex: Tampa superior, Eixo principal"
                  {...form.register('location')}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="part-category">Categoria *</Label>
                <Input
                  id="part-category"
                  list="category-suggestions"
                  placeholder="Ex: Borracha, Parafuso…"
                  {...form.register('category')}
                />
                <datalist id="category-suggestions">
                  {SUGGESTED_CATEGORIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                {form.formState.errors.category && (
                  <p className="text-xs text-destructive">{form.formState.errors.category.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="part-quantity">Quantidade *</Label>
                  <Input
                    id="part-quantity"
                    type="number"
                    min={1}
                    {...form.register('quantity', {
                      onChange: (e) => form.setValue('quantity', e.target.valueAsNumber),
                    })}
                  />
                  {form.formState.errors.quantity && (
                    <p className="text-xs text-destructive">{form.formState.errors.quantity.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="part-price">Preço unit. (R$)</Label>
                  <Input
                    id="part-price"
                    type="text"
                    placeholder="0,00"
                    {...form.register('unitPriceReais')}
                  />
                </div>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="part-notes">Observações</Label>
                <Input
                  id="part-notes"
                  placeholder="Especificação adicional, fornecedor preferido…"
                  {...form.register('notes')}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={closeForm}>
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={isPending}>
                <Check className="h-4 w-4 mr-1" />
                {isPending ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Adicionar'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      {items.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2.5 font-medium">Componente</th>
                <th className="text-left px-3 py-2.5 font-medium hidden md:table-cell">Localização</th>
                <th className="text-left px-3 py-2.5 font-medium">Categoria</th>
                <th className="text-right px-3 py-2.5 font-medium">Qtd</th>
                <th className="text-right px-3 py-2.5 font-medium hidden sm:table-cell">Preço Unit.</th>
                <th className="text-right px-3 py-2.5 font-medium hidden sm:table-cell">Total</th>
                <th className="px-3 py-2.5 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-3 py-2.5">
                    <span className="font-medium">{item.name}</span>
                    {item.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>
                    )}
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
                      <span className="text-muted-foreground text-xs italic">a cotar</span>
                    ) : (
                      displayPrice(item.unitPriceCents)
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums hidden sm:table-cell">
                    {item.unitPriceCents === 0 ? (
                      <span className="text-muted-foreground text-xs italic">—</span>
                    ) : (
                      displayPrice(item.unitPriceCents * item.quantity)
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(item)}
                        disabled={isPending}
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="Remover"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted/30 border-t">
              <tr>
                <td colSpan={3} className="px-3 py-2.5 text-sm font-medium">
                  Total
                  {uncotedCount > 0 && (
                    <span className="text-xs font-normal text-muted-foreground ml-1.5">
                      ({uncotedCount} {uncotedCount === 1 ? 'item' : 'itens'} a cotar)
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                  {items.reduce((sum, i) => sum + i.quantity, 0)}
                </td>
                <td className="hidden sm:table-cell" />
                <td className="px-3 py-2.5 text-right tabular-nums font-medium hidden sm:table-cell">
                  {totalCents > 0 ? displayPrice(totalCents) : '—'}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {items.length === 0 && !showForm && (
        <div className="border-2 border-dashed rounded-lg p-10 text-center text-muted-foreground">
          <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Cadastre os componentes desta máquina para criar listas de cotação.</p>
        </div>
      )}
    </div>
  );
}
