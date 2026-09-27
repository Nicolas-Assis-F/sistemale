import Link from 'next/link';
import type { ReactNode } from 'react';
import { buttonVariants } from '@/components/ui/button';

export function AdminRecords({ rows, empty, createHref, createLabel }: {
  rows: { id: string; title: ReactNode; details: { label: string; value: ReactNode }[]; actions: ReactNode }[];
  empty: string;
  createHref: string;
  createLabel: string;
}) {
  if (!rows.length) return <div className="rounded-2xl border border-dashed border-le-line bg-le-surface px-5 py-12 text-center">
    <p className="text-sm text-le-muted">{empty}</p>
    <Link href={createHref} className={buttonVariants({ variant: 'outline', className: 'mt-4' })}>{createLabel}</Link>
  </div>;
  return <ul className="grid gap-3 xl:gap-0 xl:overflow-hidden xl:rounded-2xl xl:border xl:border-le-line xl:bg-le-surface xl:divide-y xl:divide-le-line">
    {rows.map((row) => <li key={row.id} className="flex min-w-0 flex-col gap-4 rounded-2xl border border-le-line bg-le-surface p-4 xl:flex-row xl:items-center xl:rounded-none xl:border-0 xl:p-5">
      <div className="min-w-0 flex-1 break-words font-medium text-le-text">{row.title}</div>
      <dl className="grid flex-[2] grid-cols-2 gap-4 text-sm xl:flex xl:flex-wrap xl:justify-end xl:gap-7">
        {row.details.map((detail) => <div className="min-w-0" key={detail.label}><dt className="mb-1 text-[11px] text-le-muted">{detail.label}</dt><dd className="break-words">{detail.value}</dd></div>)}
      </dl>
      <div className="flex flex-wrap justify-end gap-2 border-t border-le-line pt-3 xl:border-0 xl:pt-0">{row.actions}</div>
    </li>)}
  </ul>;
}
