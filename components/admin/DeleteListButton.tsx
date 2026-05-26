'use client';

import { Trash2 } from 'lucide-react';
import { deletePurchaseList } from '@/app/admin/lista-compras/_actions';

export function DeleteListButton({ id, name }: { id: string; name: string }) {
  async function handleDelete() {
    if (!confirm(`Excluir a lista "${name}"? Esta ação não pode ser desfeita.`)) return;
    await deletePurchaseList(id);
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
      title="Excluir lista"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}
