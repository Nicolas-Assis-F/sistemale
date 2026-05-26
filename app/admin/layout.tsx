import Image from 'next/image';
import Link from 'next/link';
import { isAuthenticated } from '@/lib/auth';
import { LayoutDashboard, Package, Tag, LogOut, ExternalLink, ShoppingCart } from 'lucide-react';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const authed = await isAuthenticated();

  if (!authed) return <>{children}</>;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 hidden md:flex flex-col bg-sidebar">
        {/* Logo */}
        <div className="p-5 border-b border-sidebar-border">
          <Link href="/" className="flex items-center">
            <Image
              src="/LOGO.png"
              alt="L & E Torneadora"
              width={130}
              height={40}
              className="h-8 w-auto object-contain brightness-0 invert"
            />
          </Link>
          <p className="text-xs mt-1.5 font-medium text-sidebar-foreground/50">
            Painel Administrativo
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          <NavLink href="/admin" icon={LayoutDashboard}>Dashboard</NavLink>
          <NavLink href="/admin/produtos" icon={Package}>Produtos</NavLink>
          <NavLink href="/admin/categorias" icon={Tag}>Categorias</NavLink>
          <NavLink href="/admin/lista-compras" icon={ShoppingCart}>Lista de Compras</NavLink>
        </nav>

        {/* Footer sidebar */}
        <div className="p-3 space-y-1 border-t border-sidebar-border">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Ver site
          </Link>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm rounded-lg text-sidebar-foreground/60 hover:bg-red-500/15 hover:text-red-400 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto bg-muted/20">
        {children}
      </main>
    </div>
  );
}

function NavLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
    >
      <Icon className="h-4 w-4 text-sidebar-primary" />
      {children}
    </Link>
  );
}
