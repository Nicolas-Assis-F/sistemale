import { notFound } from 'next/navigation';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { prisma } from '@/lib/db';
import { CategoryForm } from '@/components/admin/CategoryForm';
import { updateCategory } from '../_actions';
import { requireAdmin } from '@/lib/auth';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCategoryPage({ params }: PageProps) {
  await requireAdmin(); // não depende só do proxy (defesa em profundidade)
  const { id } = await params;
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) notFound();

  const action = updateCategory.bind(null, id);

  return (
    <div className="le-admin-page">
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/admin/categorias" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          ← Voltar
        </Link>
        <p className="le-kicker">Gestão / Categorias</p><h1 className="le-admin-title">Editar: {category.name}</h1>
      </div>
      <CategoryForm
        defaultValues={{
          name: category.name,
          slug: category.slug,
          description: category.description ?? '',
          icon: category.icon ?? '',
          order: category.order,
        }}
        action={action}
        submitLabel="Salvar alterações"
      />
    </div>
  );
}
