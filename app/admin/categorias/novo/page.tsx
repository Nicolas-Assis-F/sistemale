import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { CategoryForm } from '@/components/admin/CategoryForm';
import { createCategory } from '../_actions';
import { requireAdmin } from '@/lib/auth';

export default async function NewCategoryPage() {
  await requireAdmin(); // não depende só do proxy (defesa em profundidade)
  return (
    <div className="le-admin-page">
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/admin/categorias" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          ← Voltar
        </Link>
        <p className="le-kicker">Gestão / Categorias</p><h1 className="le-admin-title">Nova categoria</h1>
      </div>
      <CategoryForm action={createCategory} submitLabel="Criar Categoria" />
    </div>
  );
}
