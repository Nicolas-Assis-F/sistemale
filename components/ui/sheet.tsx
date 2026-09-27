"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Slide-over lateral (painel à direita) sobre o Dialog do base-ui.
 * Foco preso, Esc fecha, scroll do body travado — mesma acessibilidade do Dialog.
 */
function Sheet(props: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="sheet" {...props} />
}

function SheetContent({
  className,
  children,
  side = "right",
  ...props
}: DialogPrimitive.Popup.Props & { side?: "right" | "bottom" }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        data-slot="sheet-overlay"
        className="fixed inset-0 z-50 bg-le-ink/40 duration-300 supports-backdrop-filter:backdrop-blur-[3px] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
      />
      <DialogPrimitive.Popup
        data-slot="sheet-content"
        className={cn(
          "fixed z-50 flex flex-col bg-background text-foreground shadow-[0_0_0_1px_rgb(11_10_59/0.06),-24px_0_80px_-20px_rgb(11_10_59/0.35)] outline-none duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] data-open:animate-in data-closed:animate-out",
          side === "right" &&
            "inset-y-0 right-0 h-dvh w-full sm:w-[min(920px,calc(100vw-3rem))] sm:rounded-l-2xl data-open:slide-in-from-right data-closed:slide-out-to-right",
          side === "bottom" &&
            "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-2xl data-open:slide-in-from-bottom data-closed:slide-out-to-bottom",
          className
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  )
}

function SheetHeader({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-7 sm:py-5", className)}
      {...props}
    >
      <div className="min-w-0">{children}</div>
      <DialogPrimitive.Close
        aria-label="Fechar painel"
        className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <XIcon className="h-4.5 w-4.5" />
      </DialogPrimitive.Close>
    </div>
  )
}

function SheetTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="sheet-title"
      className={cn("truncate font-heading text-xl font-medium tracking-[-0.03em]", className)}
      {...props}
    />
  )
}

function SheetDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="sheet-description"
      className={cn("mt-1 text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

export { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription }
