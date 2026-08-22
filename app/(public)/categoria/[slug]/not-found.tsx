import Link from 'next/link';
import { Package } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { IconTile } from '@/components/public/IconTile';

export default function NotFound() {
  return (
    <div className="container mx-auto flex min-h-[50vh] flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <div className="h-40 w-40 overflow-hidden rounded-2xl">
        <IconTile icon={Package} />
      </div>
      <div>
        <h1 className="text-xl font-bold">Categoria não encontrada</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A categoria que você procura não existe ou foi removida.
        </p>
      </div>
      <Link href="/busca" className={buttonVariants({ size: 'sm' })}>
        Ver catálogo completo
      </Link>
    </div>
  );
}
