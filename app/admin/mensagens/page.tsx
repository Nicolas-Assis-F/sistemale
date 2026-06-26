import Link from 'next/link';
import { Mail, MailOpen } from 'lucide-react';
import { prisma } from '@/lib/db';

export default async function AdminMessagesPage() {
  const messages = await prisma.contactSubmission.findMany({ orderBy: { createdAt: 'desc' } });
  const unread = messages.filter((m) => !m.read).length;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Mensagens</h1>
        <p className="text-sm text-muted-foreground">
          {messages.length} mensagens · {unread} não lida{unread !== 1 ? 's' : ''}
        </p>
      </div>

      {messages.length > 0 ? (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          {messages.map((m) => (
            <li key={m.id}>
              <Link
                href={`/admin/mensagens/${m.id}`}
                className={`flex items-center gap-3 p-4 transition-colors hover:bg-muted/40 ${m.read ? '' : 'bg-blue-500/5'}`}
              >
                <span className={`shrink-0 ${m.read ? 'text-muted-foreground' : 'text-blue-600'}`}>
                  {m.read ? <MailOpen className="h-5 w-5" /> : <Mail className="h-5 w-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`truncate text-sm ${m.read ? 'font-medium' : 'font-bold'}`}>{m.name}</p>
                    {!m.read && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{m.subject || m.message}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {m.createdAt.toLocaleDateString('pt-BR')}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">
          <Mail className="mx-auto mb-2 h-10 w-10 opacity-40" />
          <p className="text-sm">Nenhuma mensagem recebida ainda.</p>
        </div>
      )}
    </div>
  );
}
