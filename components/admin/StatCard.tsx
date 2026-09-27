import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
export function StatCard({
  label,
  value,
  detail,
  href,
}: {
  label: string;
  value: number | string;
  detail: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-le-line bg-white p-6 transition-shadow hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs text-le-muted">{label}</p>
        <ArrowUpRight
          size={15}
          className="text-le-muted group-hover:text-primary"
        />
      </div>
      <p className="mt-5 font-heading text-4xl font-medium tracking-[-.06em]">
        {value}
      </p>
      <p className="mt-3 text-[11px] text-le-muted">{detail}</p>
    </Link>
  );
}
