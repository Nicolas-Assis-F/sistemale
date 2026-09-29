import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { buttonVariants } from '@/components/ui/button';
import { SiteContentForm } from '@/components/admin/SiteContentForm';
import { saveSiteContent } from '../_actions';
import { DEFAULT_HOME, DEFAULT_SOBRE, DEFAULT_SERVICOS, DEFAULT_CONTATO } from '@/lib/site-content';
import { requireAdmin } from '@/lib/auth';

const DEFAULTS: Record<string, object> = {
  home: DEFAULT_HOME,
  sobre: DEFAULT_SOBRE,
  servicos: DEFAULT_SERVICOS,
  contato: DEFAULT_CONTATO,
};

const LABELS: Record<string, string> = {
  home: 'Página Inicial',
  sobre: 'A Empresa',
  servicos: 'Serviços',
  contato: 'Contato',
};

export default async function EditContentPage({ params }: { params: Promise<{ key: string }> }) {
  await requireAdmin(); // não depende só do proxy (defesa em profundidade)
  const { key } = await params;
  if (!DEFAULTS[key]) notFound();

  const row = await prisma.siteContent.findUnique({ where: { key } }).catch(() => null);
  const values = { ...DEFAULTS[key], ...((row?.value as object) ?? {}) } as Record<string, unknown>;

  const saveWithKey = saveSiteContent.bind(null, key);

  return (
    <div className="le-admin-page">
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/admin/conteudo" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>← Voltar</Link>
        <p className="le-kicker">Gestão / Conteudo</p><h1 className="le-admin-title">Conteúdo · {LABELS[key]}</h1>
      </div>
      <SiteContentForm contentKey={key} defaultValues={values} action={saveWithKey} />
    </div>
  );
}
