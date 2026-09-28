import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import type { FiscalReadiness } from '@/lib/domains/customers/fiscal-readiness';

/** Pendências do cadastro para emitir NF-e. Não é garantia de autorização da SEFAZ. */
export function FiscalReadinessPanel({ readiness, compact = false }: { readiness: FiscalReadiness; compact?: boolean }) {
  if (readiness.ready) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-le-success/30 bg-le-success-surface px-3 py-2.5 text-sm text-le-success">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-medium">Cadastro completo para faturar</p>
          {!compact && readiness.warnings.map((w) => <p key={w.field} className="mt-0.5 text-xs text-le-muted">{w.message}</p>)}
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-sm">
      <p className="flex items-center gap-2 font-medium text-amber-800">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        {readiness.issues.length} pendência(s) para emitir a nota fiscal
      </p>
      {!compact && (
        <ul className="mt-1.5 space-y-0.5 pl-6 text-xs text-amber-900/80">
          {readiness.issues.map((i) => <li key={i.field} className="list-disc">{i.message}</li>)}
          {readiness.warnings.map((w) => (
            <li key={w.field} className="flex list-none items-center gap-1 text-le-muted"><Info className="-ml-4 h-3 w-3" /> {w.message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function FiscalBadge({ readiness }: { readiness: FiscalReadiness }) {
  return readiness.ready
    ? <span className="rounded-full bg-le-success-surface px-2 py-0.5 text-[11px] font-semibold text-le-success">Pronto p/ NF-e</span>
    : <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-800" title={readiness.issues.map((i) => i.message).join('\n')}>{readiness.issues.length} pendência(s)</span>;
}
