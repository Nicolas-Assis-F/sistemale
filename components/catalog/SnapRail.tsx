"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Trilho horizontal com scroll nativo + scroll-snap (substitui carrosséis):
 * arrasta/rola com inércia do sistema, setas só no desktop, barra de progresso.
 */
export function SnapRail({ children, label, className }: { children: React.ReactNode; label: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState({ start: true, end: false, progress: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      setState({ start: el.scrollLeft <= 4, end: el.scrollLeft >= max - 4, progress: max > 0 ? el.scrollLeft / max : 1 });
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const step = (dir: number) => {
    const el = ref.current;
    const card = el?.firstElementChild as HTMLElement | null;
    if (!el || !card) return;
    el.scrollBy({ left: dir * (card.offsetWidth + 16), behavior: "smooth" });
  };

  return (
    <div className={className}>
      <div ref={ref} className="le-rail" role="region" aria-label={label} tabIndex={0}>
        {children}
      </div>
      <div className="mt-6 flex items-center gap-4">
        <div className="h-0.5 flex-1 overflow-hidden rounded-full bg-le-line">
          <div className="h-full origin-left rounded-full bg-le-ink transition-transform duration-200" style={{ transform: `scaleX(${Math.max(0.08, state.progress)})` }} />
        </div>
        <div className="hidden gap-2 sm:flex">
          {([[-1, ArrowLeft, state.start, "Anterior"], [1, ArrowRight, state.end, "Próximo"]] as const).map(([dir, Icon, disabled, name]) => (
            <button
              key={dir}
              onClick={() => step(dir)}
              disabled={disabled}
              aria-label={name}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border border-le-line bg-white text-le-text transition-[transform,opacity] hover:border-le-ink hover:bg-le-ink hover:text-white disabled:pointer-events-none disabled:opacity-35",
              )}
            >
              <Icon size={16} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
