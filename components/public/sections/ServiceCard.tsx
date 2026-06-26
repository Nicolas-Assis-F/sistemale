import { resolveIcon } from './icon-map';

interface Props {
  title: string;
  description: string;
  icon?: string | null;
}

export function ServiceCard({ title, description, icon }: Props) {
  const Icon = resolveIcon(icon);
  return (
    <div className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-raised">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}
