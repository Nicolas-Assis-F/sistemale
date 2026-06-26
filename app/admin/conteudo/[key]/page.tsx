import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { buttonVariants } from '@/components/ui/button';
import { SiteContentForm } from '@/components/admin/SiteContentForm';
import { saveSiteContent } from '../_actions';
import { DEFAULT_HOME, DEFAULT_SOBRE, DEFAULT_SERVICOS, DEFAULT_CONTATO } from '@/lib/site-content';

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
  const { key } = await params;
  if (!DEFAULTS[key]) notFound();

  const row = await prisma.siteContent.findUnique({ where: { key } }).catch(() => null);
  const values = { ...DEFAULTS[key], ...((row?.value as object) ?? {}) } as Record<string, unknown>;

  const saveWithKey = saveSiteContent.bind(null, key);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/conteudo" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>← Voltar</Link>
        <h1 className="text-2xl font-bold">Conteúdo · {LABELS[key]}</h1>
      </div>
      <SiteContentForm contentKey={key} defaultValues={values} action={saveWithKey} />
    </div>
  );
}
