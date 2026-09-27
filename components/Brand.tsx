import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Brand({
  href,
  variant = "light",
  showWordmark = true,
  priority = false,
  className,
  iconClassName,
}: {
  href?: string;
  variant?: "light" | "dark";
  showWordmark?: boolean;
  priority?: boolean;
  className?: string;
  iconClassName?: string;
}) {
  const mark = (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <Image
        src="/LOGO.png"
        alt=""
        width={48}
        height={48}
        sizes="48px"
        preload={priority}
        className={cn("h-11 w-11 rounded-xl object-contain", iconClassName)}
      />
      {showWordmark && (
        <span
          className={cn(
            "flex flex-col",
            variant === "dark" ? "text-white" : "text-le-ink",
          )}
        >
          <span className="font-heading text-lg font-bold tracking-[-.06em]">
            L&E TORNEADORA<span className="text-le-blue">.</span>
          </span>
          <span className="mt-1 text-[11px] font-semibold uppercase tracking-[.15em] opacity-75">
            Engenharia para perfuração
          </span>
        </span>
      )}
    </span>
  );
  return href ? (
    <Link href={href} aria-label="L&E Torneadora — início" className="shrink-0">
      {mark}
    </Link>
  ) : (
    mark
  );
}
