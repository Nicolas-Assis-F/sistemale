'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Search, X } from 'lucide-react';

export interface FilterDefinition {
  name: string;
  label: string;
  options: { value: string; label: string }[];
}

/** Shared URL search for listings; updates retain all unrelated filters. */
export function AdminFilters({ placeholder = 'Buscar por nome', filters = [] }: { placeholder?: string; filters?: FilterDefinition[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const search = params.toString();
  const query = params.get('q') ?? '';
  const [q, setQ] = useState(query);
  const [pending, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(search);
  latest.current = search;

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    setQ(query);
  }, [query]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => {
    const focus = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey && !target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')) {
        event.preventDefault(); input.current?.focus();
      }
    };
    window.addEventListener('keydown', focus);
    return () => window.removeEventListener('keydown', focus);
  }, []);

  function update(patch: Record<string, string>) {
    const next = new URLSearchParams(latest.current);
    for (const [key, value] of Object.entries(patch)) value ? next.set(key, value) : next.delete(key);
    next.delete('pagina');
    latest.current = next.toString();
    startTransition(() => router.replace(`${pathname}${next.size ? `?${next}` : ''}`, { scroll: false }));
  }
  function searchFor(value: string) {
    setQ(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => update({ q: value }), 250);
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-le-line bg-le-surface p-4" aria-busy={pending}>
      <label className="min-w-0 flex-[1_1_16rem] text-xs font-medium text-le-muted">
        {placeholder}
        <span className="relative mt-1.5 block">
          {pending ? <Loader2 aria-hidden className="absolute left-3 top-3 size-4 animate-spin text-le-blue" /> : <Search aria-hidden className="absolute left-3 top-3 size-4" />}
          <input ref={input} value={q} onChange={(e) => searchFor(e.target.value)} type="search" className="h-10 w-full rounded-xl border border-le-line bg-le-surface pl-9 pr-12 text-sm text-le-text focus-visible:outline-2" />
          {q ? <button type="button" onClick={() => { searchFor(''); input.current?.focus(); }} aria-label="Limpar busca" className="absolute right-1 top-1 rounded-lg p-2"><X className="size-4" /></button> : <kbd className="absolute right-3 top-2.5 text-sm">/</kbd>}
        </span>
      </label>
      {filters.map((filter) => (
        <label key={filter.name} className="min-w-0 flex-[1_1_10rem] text-xs font-medium text-le-muted">
          {filter.label}
          <select value={params.get(filter.name) ?? ''} onChange={(e) => {
            if (timer.current) clearTimeout(timer.current);
            update({ q, [filter.name]: e.target.value });
          }} className="mt-1.5 h-10 w-full rounded-xl border border-le-line bg-le-surface px-3 text-sm text-le-text">
            {filter.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      ))}
    </div>
  );
}
