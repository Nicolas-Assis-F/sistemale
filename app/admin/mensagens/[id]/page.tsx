import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Mail, Phone, MessageCircle, Trash2, Calendar } from 'lucide-react';
import { prisma } from '@/lib/db';
import { buttonVariants } from '@/components/ui/button';
import { markRead, deleteSubmission } from '../_actions';

export default async function MessageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const message = await prisma.contactSubmission.findUnique({ where: { id } });
  if (!message) notFound();

  // Marca como lida ao abrir (dynamic page, sem revalidate em render)
  if (!message.read) {
    await prisma.contactSubmission.update({ where: { id }, data: { read: true } }).catch(() => {});
  }

  const waUrl = message.phone
    ? `https://wa.me/${message.phone.replace(/\D/g, '')}`
    : null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/mensagens" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>← Voltar</Link>
        <h1 className="text-2xl font-bold">Mensagem</h1>
      </div>

      <div className="max-w-2xl space-y-5 rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{message.name}</h2>
            <p className="text-sm text-muted-foreground">{message.subject || 'Sem assunto'}</p>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            {message.createdAt.toLocaleString('pt-BR')}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <a href={`mailto:${message.email}`} className={buttonVariants({ variant: 'outline', size: 'sm' }) + ' gap-2'}>
            <Mail className="h-4 w-4" /> {message.email}
          </a>
          {message.phone && (
            <a href={`tel:${message.phone}`} className={buttonVariants({ variant: 'outline', size: 'sm' }) + ' gap-2'}>
              <Phone className="h-4 w-4" /> {message.phone}
            </a>
          )}
          {waUrl && (
            <a href={waUrl} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: 'outline', size: 'sm' }) + ' gap-2 text-green-700'}>
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
          )}
        </div>

        <div className="whitespace-pre-wrap rounded-xl bg-muted/50 p-4 text-sm leading-relaxed">
          {message.message}
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <form action={async () => { 'use server'; await markRead(id, false); }}>
            <button type="submit" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
              Marcar como não lida
            </button>
          </form>
          <form action={async () => { 'use server'; await deleteSubmission(id); }}>
            <button type="submit" className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' gap-2 text-destructive hover:text-destructive'}>
              <Trash2 className="h-4 w-4" /> Excluir
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
