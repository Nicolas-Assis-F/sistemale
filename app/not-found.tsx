import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <h1 className="text-6xl font-extrabold text-primary">404</h1>
      <h2 className="text-2xl font-bold">Página não encontrada</h2>
      <p className="text-muted-foreground">
        O produto ou página que você buscou não existe ou foi removido.
      </p>
      <Link href="/" className={buttonVariants()}>Voltar para a home</Link>
    </div>
  );
}
