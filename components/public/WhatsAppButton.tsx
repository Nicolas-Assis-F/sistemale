'use client';

import { MessageCircle } from 'lucide-react';
import { buildWhatsAppUrl } from '@/lib/whatsapp-url';
import { cn } from '@/lib/utils';

interface Props {
  sku?: string;
  productName?: string;
  className?: string;
  children?: React.ReactNode;
  size?: 'default' | 'large';
}

export function WhatsAppButton({ sku, productName, className, children, size = 'default' }: Props) {
  const url = buildWhatsAppUrl({ sku, productName });

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-colors bg-green-600 hover:bg-green-700 text-white',
        size === 'large' ? 'px-6 py-4 text-lg w-full' : 'px-4 py-2 text-sm',
        className
      )}
    >
      <MessageCircle className={size === 'large' ? 'h-6 w-6' : 'h-4 w-4'} />
      {children ?? 'Falar no WhatsApp'}
    </a>
  );
}
