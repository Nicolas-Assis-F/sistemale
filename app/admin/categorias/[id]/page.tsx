import { notFound } from 'next/navigation';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { prisma } from '@/lib/db';
import { CategoryForm } from '@/components/admin/CategoryForm';
import { updateCategory } from '../_actions';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCategoryPage({ params }: PageProps) {
  const { id } = await params;
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) notFound();

  const action = updateCategory.bind(null, id);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/categorias" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          ← Voltar
        </Link>
        <h1 className="text-2xl font-bold">Editar: {category.name}</h1>
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
        submitLabel="Salvar Alterações"
      />
    </div>
  );
}
