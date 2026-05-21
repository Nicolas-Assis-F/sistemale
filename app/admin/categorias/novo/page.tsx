import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { CategoryForm } from '@/components/admin/CategoryForm';
import { createCategory } from '../_actions';

export default function NewCategoryPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/categorias" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          ← Voltar
        </Link>
        <h1 className="text-2xl font-bold">Nova Categoria</h1>
      </div>
      <CategoryForm action={createCategory} submitLabel="Criar Categoria" />
    </div>
  );
}
