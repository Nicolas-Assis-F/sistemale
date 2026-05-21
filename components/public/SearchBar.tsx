'use client';

import { Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRef, type FormEvent } from 'react';
import { Input } from '@/components/ui/input';

export function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const q = inputRef.current?.value.trim();
    if (q) router.push(`/busca?q=${encodeURIComponent(q)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        ref={inputRef}
        type="search"
        placeholder="Buscar produtos..."
        defaultValue={searchParams.get('q') ?? ''}
        className="pl-9 h-9"
      />
    </form>
  );
}
