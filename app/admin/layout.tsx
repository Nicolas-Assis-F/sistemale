import Image from 'next/image';
import Link from 'next/link';
import { isAuthenticated } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { AdminNav } from '@/components/admin/AdminNav';
import { MobileSidebar } from '@/components/admin/MobileSidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const authed = await isAuthenticated();

  if (!authed) return <>{children}</>;

  const unreadCount = await prisma.contactSubmission.count({ where: { read: false } }).catch(() => 0);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar desktop */}
      <aside className="hidden w-60 shrink-0 flex-col bg-sidebar md:flex">
        <div className="border-b border-sidebar-border p-5">
          <Link href="/" className="flex items-center">
            <Image
              src="/LOGO.png"
              alt="LE Torneadora"
              width={130}
              height={40}
              className="h-8 w-auto object-contain brightness-0 invert"
            />
          </Link>
          <p className="mt-1.5 text-xs font-medium text-sidebar-foreground/50">Painel Administrativo</p>
        </div>
        <AdminNav unreadCount={unreadCount} />
      </aside>

      {/* Conteúdo */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar mobile */}
        <div className="flex h-14 items-center gap-3 border-b border-border bg-sidebar px-4 md:hidden">
          <MobileSidebar unreadCount={unreadCount} />
          <Image
            src="/LOGO.png"
            alt="LE Torneadora"
            width={110}
            height={32}
            className="h-7 w-auto object-contain brightness-0 invert"
          />
        </div>
        <main className="flex-1 overflow-auto bg-muted/20">{children}</main>
      </div>
    </div>
  );
}
