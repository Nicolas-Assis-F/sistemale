'use client';

import { deleteProduct } from '@/app/admin/produtos/_actions';
import { ConfirmDeleteButton } from './ConfirmDeleteButton';

export function DeleteProductButton({ id, name }: { id: string; name: string }) {
  return (
    <ConfirmDeleteButton
      action={() => deleteProduct(id)}
      confirmMessage={`Excluir "${name}"? Esta ação não pode ser desfeita.`}
      label="Excluir"
    />
  );
}
