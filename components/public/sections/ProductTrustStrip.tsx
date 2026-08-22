import { resolveIcon } from './icon-map';
import { IconBadge } from '../IconBadge';

interface Props {
  items: { icon?: string; title: string; description: string }[];
}

/** Faixa compacta de confiança para o perfil do produto — reaproveita os mesmos itens de garantia da home. */
export function ProductTrustStrip({ items }: Props) {
  if (!items || items.length === 0) return null;
  const top = items.slice(0, 3);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {top.map((it) => {
        const Icon = resolveIcon(it.icon);
        return (
          <div key={it.title} className="group flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3">
            <IconBadge icon={Icon} />
            <div>
              <p className="text-sm font-semibold leading-tight">{it.title}</p>
              <p className="text-xs leading-snug text-muted-foreground">{it.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
