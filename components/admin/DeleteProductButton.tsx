'use client';

import { buttonVariants } from '@/components/ui/button';
import { deleteProduct } from '@/app/admin/produtos/_actions';

export function DeleteProductButton({ id, name }: { id: string; name: string }) {
  async function handleDelete() {
    if (!confirm(`Excluir "${name}"? Esta ação não pode ser desfeita.`)) return;
    await deleteProduct(id);
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' text-destructive hover:text-destructive hover:bg-destructive/10'}
    >
      Excluir
    </button>
  );
}
