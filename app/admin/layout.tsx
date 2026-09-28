import { todayStartBR } from "@/lib/finance/summary";
import { buttonVariants } from "@/components/ui/button";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Brand } from "@/components/Brand";
import { AdminNav } from "@/components/admin/AdminNav";
import { MobileSidebar } from "@/components/admin/MobileSidebar";
import { CommandPalette, CommandPaletteTrigger } from "@/components/admin/CommandPalette";
import { Toaster } from "@/components/admin/toast";
import { MotionProvider } from "@/components/public/MotionProvider";
import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAuthenticated()))
    return <MotionProvider>{children}</MotionProvider>;
  const [unreadCount, inFabricationCount, commissionsDueCount, financeOverdueCount, integrationIssuesCount] = await Promise.all([
    prisma.contactSubmission.count({ where: { read: false } }),
    prisma.order.count({ where: { status: "EM_FABRICACAO" } }),
    prisma.commission.count({ where: { status: "LIBERADA" } }),
    prisma.financeEntry.count({ where: { status: "PREVISTO", type: "DESPESA", dueDate: { lt: todayStartBR() } } }),
    prisma.job.count({ where: { status: "DEAD" } }),
  ]);
  return (
    <MotionProvider>
    <div className="le-admin flex min-h-screen">
      <aside className="le-admin-sidebar hidden shrink-0 flex-col md:flex">
        <div className="border-b border-white/10 px-5 py-7">
          <Brand
            href="/admin"
            variant="dark"
            iconClassName="h-9 w-9"
            className="gap-2 [&_span.font-heading]:text-sm"
          />
          <span className="ml-11 mt-4 inline-block rounded-md border border-white/10 px-2 py-1 text-[11px] uppercase tracking-[.2em] text-white/70">
            Workspace
          </span>
        </div>
        <AdminNav
          unreadCount={unreadCount}
          inFabricationCount={inFabricationCount}
          commissionsDueCount={commissionsDueCount}
          financeOverdueCount={financeOverdueCount}
          integrationIssuesCount={integrationIssuesCount}
        />
      </aside>
      <div className="min-w-0 flex-1">
        <header className="le-admin-topbar flex h-20 items-center justify-between gap-3 px-5 lg:px-10">
          <div className="flex items-center gap-3">
            <MobileSidebar
              unreadCount={unreadCount}
              inFabricationCount={inFabricationCount}
              commissionsDueCount={commissionsDueCount}
              financeOverdueCount={financeOverdueCount}
              integrationIssuesCount={integrationIssuesCount}
            />
            <span className="text-xs text-le-muted">
              Seu espaço de trabalho{" "}
              <span className="mx-2 text-[#d1d3e0]">/</span>
              <strong className="text-le-text">L&E</strong>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <CommandPaletteTrigger />
            <Link
              href="/vitrine"
              target="_blank"
              className="hidden items-center gap-2 text-xs text-le-muted sm:flex"
            >
              Ver vitrine <ArrowUpRight size={14} />
            </Link>
            <span className="hidden h-6 w-px bg-le-line sm:block" />
            <Link
              href="/admin/produtos?novo=1"
              className="inline-flex items-center gap-2 rounded-lg bg-le-blue px-3 py-2.5 text-xs font-medium text-white"
            >
              <Plus size={14} /> Novo produto
            </Link>
            <div className="hidden h-8 w-8 items-center justify-center rounded-full bg-le-subtle text-[11px] font-semibold text-le-muted lg:flex">
              LE
            </div>
          </div>
        </header>
        <main>{children}</main>
      </div>
      <CommandPalette />
      <Toaster />
    </div>
    </MotionProvider>
  );
}
