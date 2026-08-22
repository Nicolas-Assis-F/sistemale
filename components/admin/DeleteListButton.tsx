'use client';

import { deletePurchaseList } from '@/app/admin/lista-compras/_actions';
import { ConfirmDeleteButton } from './ConfirmDeleteButton';

export function DeleteListButton({ id, name }: { id: string; name: string }) {
  return (
    <ConfirmDeleteButton
      action={() => deletePurchaseList(id)}
      confirmMessage={`Excluir a lista "${name}"? Esta ação não pode ser desfeita.`}
    />
  );
}
