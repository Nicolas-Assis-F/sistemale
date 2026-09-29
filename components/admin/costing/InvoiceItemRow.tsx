'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { applyInvoiceItem } from '@/app/admin/custos/_actions';
import { toast } from '@/components/admin/toast';
import { formatCurrency } from '@/lib/format';
import { isKgUnit, kgPerMeter, parseDecimal } from '@/lib/domains/costing/steel';
import { inputCls } from './ActionForm';

type Mat = { id: string; name: string; kind: string; unit: string; diameterMm: number | null; wallMm: number | null; unitCostCents: number };
type Item = { id: string; description: string; ncm: string; unit: string; quantity: number; effectiveUnitCostCents: number; effectiveTotalCents: number; ipiCents: number; icmsStCents: number; materialId: string | null; kgPerUnit: number | null; appliedAt: string | null };

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/(\d)\.(\d\/\d)/g, '$1 $2').replace(/[^a-z0-9/ ]/g, ' ');
/** Sugere o material pelo nome (tokens em comum: "1045", "3 1/2", "sch80"…). */
function suggest(description: string, materials: Mat[]) {
  const words = new Set(norm(description).split(/\s+/).filter((w) => w.length > 1));
  let best: { id: string; score: number } | null = null;
  for (const m of materials) {
    const score = norm(m.name).split(/\s+/).filter((w) => w.length > 1 && words.has(w)).length;
    if (score >= 2 && (!best || score > best.score)) best = { id: m.id, score };
  }
  return best?.id ?? '';
}

export function InvoiceItemRow({ item, materials }: { item: Item; materials: Mat[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const initial = useMemo(() => item.materialId ?? suggest(item.description, materials), [item, materials]);
  const [materialId, setMaterialId] = useState(initial);
  const [kgPerUnit, setKgPerUnit] = useState(item.kgPerUnit ? String(item.kgPerUnit).replace('.', ',') : '');
  const [pieceLength, setPieceLength] = useState('');
  const m = materials.find((x) => x.id === materialId);
  const needsConversion = Boolean(m && m.unit === 'KG' && !isKgUnit(item.unit));
  const steel = m && (m.kind === 'BARRA_REDONDA' || m.kind === 'TUBO');

  const kg = parseDecimal(kgPerUnit) ?? (steel && parseDecimal(pieceLength) ? kgPerMeter(m!.kind as 'BARRA_REDONDA' | 'TUBO', m!.diameterMm ?? 0, m!.wallMm) * (parseDecimal(pieceLength) ?? 0) : null);
  const newCost = m ? (needsConversion ? (kg ? Math.round(item.effectiveUnitCostCents / kg) : null) : item.effectiveUnitCostCents) : null;

  return (
    <tr className="align-top">
      <td className="p-3">
        <p className="font-medium">{item.description}</p>
        <p className="text-xs text-le-muted">NCM {item.ncm || '—'} · {item.quantity.toLocaleString('pt-BR')} {item.unit}{item.ipiCents ? ` · IPI ${formatCurrency(item.ipiCents)}` : ''}{item.icmsStCents ? ` · ST ${formatCurrency(item.icmsStCents)}` : ''}</p>
      </td>
      <td className="whitespace-nowrap p-3 text-right tabular-nums">
        {formatCurrency(item.effectiveUnitCostCents)}/{item.unit.toLowerCase()}
        <p className="text-xs text-le-muted">total {formatCurrency(item.effectiveTotalCents)}</p>
      </td>
      <td className="min-w-56 p-3">
        <select value={materialId} onChange={(e) => setMaterialId(e.target.value)} className={inputCls}>
          <option value="">— não usar —</option>
          {materials.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
        {needsConversion && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {steel && <input value={pieceLength} onChange={(e) => { setPieceLength(e.target.value); setKgPerUnit(''); }} inputMode="decimal" placeholder={`m por ${item.unit.toLowerCase()}`} className={inputCls} />}
            <input value={kgPerUnit} onChange={(e) => setKgPerUnit(e.target.value)} inputMode="decimal" placeholder={`kg por ${item.unit.toLowerCase()}`} className={inputCls} />
            <p className="col-span-2 text-[11px] text-le-muted">A nota está em {item.unit}. {steel ? 'Informe o comprimento de cada peça (calcula o peso) ou o peso direto.' : 'Informe o peso de cada unidade.'}</p>
          </div>
        )}
      </td>
      <td className="whitespace-nowrap p-3 text-right">
        {m && newCost != null && (
          <p className="mb-1.5 text-xs text-le-muted">
            {formatCurrency(m.unitCostCents)} → <strong className="text-le-text">{formatCurrency(newCost)}</strong>/{m.unit.toLowerCase()}
          </p>
        )}
        <button type="button" disabled={!m || newCost == null || pending}
          onClick={() => start(async () => {
            const res = await applyInvoiceItem(item.id, materialId, needsConversion ? kg : null);
            toast('error' in res ? res.error : (res.message ?? 'Aplicado.'), 'error' in res ? 'error' : 'success');
            if (!('error' in res)) router.refresh();
          })}
          className="h-8 rounded-lg border border-le-blue px-3 text-xs font-semibold text-le-blue disabled:border-le-line disabled:text-le-muted">
          {item.appliedAt ? 'Aplicar de novo' : 'Atualizar custo'}
        </button>
        {item.appliedAt && <p className="mt-1 text-[11px] text-le-success">aplicado em {new Date(item.appliedAt).toLocaleDateString('pt-BR')}</p>}
      </td>
    </tr>
  );
}
