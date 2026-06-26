import Link from 'next/link';
import { Home, Building2, Wrench, Mail, ChevronRight } from 'lucide-react';

const SECTIONS = [
  { key: 'home', label: 'Página Inicial', desc: 'Hero e chamada final da home.', icon: Home },
  { key: 'sobre', label: 'A Empresa', desc: 'História, números e diferenciais.', icon: Building2 },
  { key: 'servicos', label: 'Serviços', desc: 'Textos e etapas do processo.', icon: Wrench },
  { key: 'contato', label: 'Contato', desc: 'Textos e horário de atendimento.', icon: Mail },
];

export default function AdminContentPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Conteúdo do site</h1>
        <p className="text-sm text-muted-foreground">Edite os textos das páginas institucionais sem mexer no código.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.key}
              href={`/admin/conteudo/${s.key}`}
              className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:border-primary/40 hover:shadow-raised"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <p className="font-semibold">{s.label}</p>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
