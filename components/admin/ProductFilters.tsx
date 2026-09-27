'use client';

import { AdminFilters } from './AdminFilters';

interface Props {
  categories: { id: string; name: string }[];
  counts: { all: number; active: number; archived: number; noPhoto: number };
}

export function ProductFilters({ categories, counts }: Props) {
  return <AdminFilters placeholder="Buscar produtos por nome ou SKU" filters={[
    { name: 'status', label: 'Publicação', options: [
      { value: '', label: `Todos (${counts.all})` },
      { value: 'ativo', label: `Publicados (${counts.active})` },
      { value: 'inativo', label: `Arquivados (${counts.archived})` },
      { value: 'semfoto', label: `Sem foto (${counts.noPhoto})` },
    ] },
    { name: 'categoria', label: 'Linha de produto', options: [{ value: '', label: 'Todas as linhas' }, ...categories.map((category) => ({ value: category.id, label: category.name }))] },
  ]} />;
}
