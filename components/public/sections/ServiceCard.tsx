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
    <div className="group flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-raised">
      <IconBadge icon={Icon} />
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}
