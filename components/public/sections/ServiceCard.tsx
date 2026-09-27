import { resolveIcon } from './icon-map';
import { IconBadge } from '../IconBadge';

interface Props {
  title: string;
  description: string;
  icon?: string | null;
}

export function ServiceCard({ title, description, icon }: Props) {
  const Icon = resolveIcon(icon);
  return (
    <div className="group relative flex h-full flex-col gap-4 overflow-hidden rounded-2xl border border-border/80 bg-card p-6 shadow-sm transition-colors duration-300 hover:border-primary/40">
      <span className="card-accent-top" aria-hidden />
      <IconBadge icon={Icon} />
      <div className="space-y-1.5">
        <h3 className="font-heading text-lg font-semibold tracking-tight">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
