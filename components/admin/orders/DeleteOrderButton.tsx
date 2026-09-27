'use client';

import { deleteOrder } from '@/app/admin/pedidos/_actions';
import { ConfirmDeleteButton } from '../ConfirmDeleteButton';

export function DeleteOrderButton({ id, number }: { id: string; number: string }) {
  return (
    <ConfirmDeleteButton
      action={async () => (await deleteOrder(id)) ?? { ok: true as const }}
      confirmMessage={`Excluir o pedido ${number}? Esta ação não pode ser desfeita.`}
      label="Excluir pedido"
    />
  );
}
