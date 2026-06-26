import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';

interface Props {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  link?: { href: string; label: string };
}

export function SectionHeading({ eyebrow, title, subtitle, align = 'left', link }: Props) {
  const centered = align === 'center';
  return (
    <div className={`mb-8 flex flex-col gap-3 ${centered ? 'items-center text-center' : 'sm:flex-row sm:items-end sm:justify-between'}`}>
      <div className={centered ? 'max-w-2xl' : ''}>
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h2 className="section-heading">{title}</h2>
        {subtitle && (
          <p className="mt-2 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl">
            {subtitle}
          </p>
        )}
      </div>
      {link && !centered && (
        <Link
          href={link.href}
          className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' text-primary gap-1 shrink-0'}
        >
          {link.label} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}
