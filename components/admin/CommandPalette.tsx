'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { CornerDownLeft, ExternalLink, Plus, Search, Upload, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ADMIN_NAV } from './nav-items';

interface Command {
  id: string;
  label: string;
  group: string;
  href: string;
  icon: LucideIcon;
  keywords?: string;
  external?: boolean;
}

const COMMANDS: Command[] = [
  { id: 'new-product', label: 'Novo produto', group: 'Criar', href: '/admin/produtos?novo=1', icon: Plus, keywords: 'cadastrar equipamento item' },
  { id: 'new-order', label: 'Novo pedido / orçamento', group: 'Criar', href: '/admin/pedidos/novo', icon: Plus, keywords: 'venda cotacao' },
  { id: 'new-customer', label: 'Novo cliente', group: 'Criar', href: '/admin/clientes/novo', icon: Plus },
  { id: 'new-category', label: 'Nova categoria', group: 'Criar', href: '/admin/categorias/novo', icon: Plus, keywords: 'linha' },
  { id: 'import', label: 'Importar produtos (planilha)', group: 'Criar', href: '/admin/produtos/importar', icon: Upload, keywords: 'csv excel' },
  ...ADMIN_NAV.flatMap((g) =>
    g.items.map((i) => ({ id: i.href, label: i.label, group: 'Ir para', href: i.href, icon: i.icon, keywords: g.title })),
  ),
  { id: 'site', label: 'Abrir vitrine pública', group: 'Site', href: '/vitrine', icon: ExternalLink, external: true, keywords: 'catalogo loja' },
];

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Paleta de comandos ⌘K / Ctrl+K: navegação e criação sem tirar a mão do teclado. */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('le-open-palette', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('le-open-palette', onOpen);
    };
  }, []);

  const results = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return COMMANDS;
    return COMMANDS.filter((c) => norm(`${c.label} ${c.group} ${c.keywords ?? ''}`).includes(q));
  }, [query]);

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  function run(cmd: Command | undefined) {
    if (!cmd) return;
    setOpen(false);
    setQuery('');
    if (cmd.external) window.open(cmd.href, '_blank', 'noopener');
    else router.push(cmd.href);
  }

  const grouped = results.reduce<Record<string, { cmd: Command; index: number }[]>>((acc, cmd, index) => {
    (acc[cmd.group] ??= []).push({ cmd, index });
    return acc;
  }, {});

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-le-ink/30 supports-backdrop-filter:backdrop-blur-[2px] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup className="fixed left-1/2 top-[14vh] z-50 w-[min(600px,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-2xl border border-le-line bg-white shadow-[0_30px_90px_-20px_rgb(11_10_59/0.45)] outline-none duration-150 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-[0.97] data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-[0.97]">
          <DialogPrimitive.Title className="sr-only">Paleta de comandos</DialogPrimitive.Title>
          <div className="flex items-center gap-3 border-b border-le-line px-4">
            <Search className="h-4 w-4 shrink-0 text-le-muted" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)); }
                if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
                if (e.key === 'Enter') { e.preventDefault(); run(results[active]); }
              }}
              placeholder="Buscar páginas e ações…"
              aria-label="Buscar comandos"
              role="combobox"
              aria-expanded
              aria-controls="le-palette-list"
              aria-activedescendant={results[active] ? `cmd-${results[active].id}` : undefined}
              className="h-14 flex-1 bg-transparent text-[15px] text-le-text outline-none placeholder:text-le-muted"
            />
            <kbd className="rounded-md border border-le-line px-1.5 py-0.5 font-mono text-[11px] text-le-muted">ESC</kbd>
          </div>
          <div ref={listRef} id="le-palette-list" role="listbox" className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
            {results.length === 0 && <p className="px-3 py-10 text-center text-sm text-le-muted">Nada encontrado para “{query}”.</p>}
            {Object.entries(grouped).map(([group, items]) => (
              <div key={group} className="mb-1">
                <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-le-muted">{group}</p>
                {items.map(({ cmd, index }) => {
                  const Icon = cmd.icon;
                  const selected = index === active;
                  return (
                    <button
                      key={cmd.id}
                      id={`cmd-${cmd.id}`}
                      data-index={index}
                      role="option"
                      aria-selected={selected}
                      onMouseMove={() => setActive(index)}
                      onClick={() => run(cmd)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] transition-colors',
                        selected ? 'bg-le-tint text-le-text' : 'text-le-text',
                      )}
                    >
                      <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg border', selected ? 'border-le-line bg-white text-le-blue' : 'border-le-line text-le-muted')}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="flex-1 font-medium">{cmd.label}</span>
                      {selected && <CornerDownLeft className="h-3.5 w-3.5 text-le-blue-light" />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 border-t border-le-line bg-le-subtle px-4 py-2.5 text-[11px] text-le-muted">
            <span><kbd className="font-mono">↑↓</kbd> navegar</span>
            <span><kbd className="font-mono">↵</kbd> abrir</span>
            <span className="ml-auto"><kbd className="font-mono">⌘K</kbd> alternar</span>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** Botão da topbar que abre a paleta (mostra o atalho). */
export function CommandPaletteTrigger() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event('le-open-palette'))}
      className="hidden h-9 w-64 items-center gap-2 rounded-lg border border-le-line bg-le-subtle px-3 text-xs text-le-muted transition-colors hover:border-le-line hover:bg-white md:flex"
    >
      <Search className="h-3.5 w-3.5" />
      <span className="flex-1 text-left">Buscar ou criar…</span>
      <kbd className="rounded border border-le-line bg-white px-1.5 font-mono text-[11px]">⌘K</kbd>
    </button>
  );
}
