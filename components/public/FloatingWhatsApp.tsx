import { MessageCircle } from 'lucide-react';
import { buildWhatsAppUrl } from '@/lib/whatsapp-url';

/**
 * Botão flutuante do WhatsApp, visível apenas no mobile/tablet (`lg:hidden`).
 * No desktop o CTA já está no cabeçalho. Fica em `z-40`, abaixo do drawer (`z-50`),
 * então some por trás do backdrop quando o menu lateral abre.
 */
export function FloatingWhatsApp() {
  return (
    <a
      href={buildWhatsAppUrl()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      className="fixed right-5 bottom-[calc(1.25rem+env(safe-area-inset-bottom))] z-40 flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-white shadow-lg shadow-green-900/25 transition-transform hover:scale-105 hover:bg-green-700 active:scale-95 lg:hidden"
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  );
}
