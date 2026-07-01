import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME ?? 'LE Torneadora';

interface BrandProps {
  /** Se informado, o lockup vira um link. */
  href?: string;
  /** 'dark' = para fundos escuros: nome em branco e ícone num chip claro. */
  variant?: 'light' | 'dark';
  /** Exibe o nome ao lado do ícone. Default: true. */
  showWordmark?: boolean;
  /** Prioriza o carregamento (usar só acima da dobra, ex.: cabeçalho). */
  priority?: boolean;
  /** Classes extras no wrapper. */
  className?: string;
  /** Sobrescreve o tamanho do ícone (ex.: 'h-11 w-11' no login). */
  iconClassName?: string;
}

/**
 * Lockup de marca (ícone + nome) reutilizado no cabeçalho, rodapé, menu mobile e admin.
 *
 * O arquivo `public/LOGO.png` é um ícone quadrado colorido (não um logo monocromático
 * transparente), por isso NÃO usamos `brightness-0 invert`. Em fundos escuros o ícone é
 * exibido dentro de um chip claro para garantir contraste.
 */
export function Brand({
  href,
  variant = 'light',
  showWordmark = true,
  priority = false,
  className,
  iconClassName,
}: BrandProps) {
  const dark = variant === 'dark';

  const inner = (
    <span className={cn('flex items-center gap-2.5', className)}>
      <span
        className={cn(
          'flex shrink-0 items-center justify-center overflow-hidden rounded-lg',
          dark && 'bg-white p-1 shadow-sm',
        )}
      >
        <Image
          src="/LOGO.png"
          alt={COMPANY_NAME}
          width={40}
          height={40}
          priority={priority}
          className={cn('h-9 w-9 rounded-md object-contain', iconClassName)}
        />
      </span>
      {showWordmark && (
        <span
          className={cn(
            'text-lg font-bold leading-none tracking-tight',
            dark ? 'text-white' : 'text-foreground',
          )}
        >
          {COMPANY_NAME}
        </span>
      )}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="flex shrink-0 items-center" aria-label={COMPANY_NAME}>
        {inner}
      </Link>
    );
  }

  return inner;
}
