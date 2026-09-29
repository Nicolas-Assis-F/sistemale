'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { applyPriceToProduct, saveSheet } from '@/app/admin/custos/_actions';
import { toast } from '@/components/admin/toast';
import { formatCurrency } from '@/lib/format';
import { parseDecimal } from '@/lib/domains/costing/steel';
import { CATEGORY_LABELS, computeSheet, type Catalog, type Category, type LineKind, type MaterialInput, type SheetInput, type WorkCenterInput } from '@/lib/domains/costing/rollup';
import { marginAtPrice, suggestPrice, type PriceInputs } from '@/lib/domains/costing/pricing';
import { cn } from '@/lib/utils';
import { inputCls, labelCls } from './ActionForm';

type Draft = {
  key: string; kind: LineKind; description: string; materialId: string; workCenterId: string; subSheetId: string;
  lengthMm: string; quantity: string; minutes: string; scrapPct: string; unitCost: string;
};
type Props = {
  sheet: { id: string; name: string; batchQty: number; ncm: string | null; notes: string | null; productId: string | null; lines: SheetInput['lines'] };
  materials: (MaterialInput & { sizeLabel?: string | null })[];
  workCenters: WorkCenterInput[];
  sheets: SheetInput[];
  products: { id: string; name: string; priceCents: number; takenBy: string | null }[];
  inputs: PriceInputs & { dasBps: number | null };
};

const KIND_OPTIONS: { kind: LineKind; label: string; hint: string }[] = [
  { kind: 'MATERIAL', label: 'Matéria-prima', hint: 'barra/tubo por kg' },
  { kind: 'COMPONENTE', label: 'Componente', hint: 'comprado pronto' },
  { kind: 'PROCESSO', label: 'Processo', hint: 'minutos × custo-hora' },
  { kind: 'SERVICO', label: 'Serviço', hint: 'usinagem terceirizada' },
  { kind: 'SUBFICHA', label: 'Subconjunto', hint: 'outra ficha' },
  { kind: 'OUTRO', label: 'Outro', hint: 'valor avulso' },
];
const str = (n: number | null | undefined) => (n == null ? '' : String(n).replace('.', ','));
const n = (s: string) => parseDecimal(s) ?? 0;
const nOrNull = (s: string) => parseDecimal(s);
let seq = 0;
const newKey = () => `l${++seq}`;

function toDraft(l: SheetInput['lines'][number]): Draft {
  return {
    key: newKey(), kind: l.kind, description: l.description ?? '', materialId: l.materialId ?? '', workCenterId: l.workCenterId ?? '', subSheetId: l.subSheetId ?? '',
    lengthMm: str(l.lengthMm), quantity: str(l.quantity), minutes: str(l.minutes), scrapPct: l.scrapBps ? str(l.scrapBps / 100) : '',
    unitCost: l.unitCostCents != null ? (l.unitCostCents / 100).toFixed(2).replace('.', ',') : '',
  };
}
function toLine(d: Draft) {
  const cost = parseDecimal(d.unitCost, true);
  return {
    kind: d.kind, description: d.description || null, materialId: d.materialId || null, workCenterId: d.workCenterId || null, subSheetId: d.subSheetId || null,
    lengthMm: nOrNull(d.lengthMm), quantity: d.quantity.trim() === '' ? 1 : n(d.quantity), minutes: nOrNull(d.minutes),
    scrapBps: d.scrapPct ? Math.round(n(d.scrapPct) * 100) : 0, unitCostCents: cost != null ? Math.round(cost * 100) : null,
  };
}

export function SheetEditor({ sheet, materials, workCenters, sheets, products, inputs }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState(sheet.name);
  const [batch, setBatch] = useState(str(sheet.batchQty));
  const [ncm, setNcm] = useState(sheet.ncm ?? '');
  const [notes, setNotes] = useState(sheet.notes ?? '');
  const [productId, setProductId] = useState(sheet.productId ?? '');
  const [drafts, setDrafts] = useState<Draft[]>(() => sheet.lines.map(toDraft));
  const [dirty, setDirty] = useState(false);
  const [marginPct, setMarginPct] = useState(String(inputs.marginBps / 100).replace('.', ','));
  const [simPrice, setSimPrice] = useState('');

  const touch = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setDirty(true); };
  const update = (key: string, patch: Partial<Draft>) => { setDrafts((ds) => ds.map((d) => (d.key === key ? { ...d, ...patch } : d))); setDirty(true); };
  const add = (kind: LineKind) => { setDrafts((ds) => [...ds, { key: newKey(), kind, description: '', materialId: '', workCenterId: '', subSheetId: '', lengthMm: '', quantity: '1', minutes: '', scrapPct: kind === 'MATERIAL' ? '5' : '', unitCost: '' }]); setDirty(true); };
  const move = (key: string, dir: -1 | 1) => { setDrafts((ds) => { const i = ds.findIndex((d) => d.key === key); const j = i + dir; if (j < 0 || j >= ds.length) return ds; const c = [...ds]; [c[i], c[j]] = [c[j], c[i]]; return c; }); setDirty(true); };
  const remove = (key: string) => { setDrafts((ds) => ds.filter((d) => d.key !== key)); setDirty(true); };

  const batchQty = n(batch) > 0 ? n(batch) : 1;
  const { result, lineResults } = useMemo(() => {
    const catalog: Catalog = {
      materials: new Map(materials.map((m) => [m.id, m])),
      workCenters: new Map(workCenters.map((w) => [w.id, w])),
      sheets: new Map(sheets.map((s) => [s.id, s])),
    };
    catalog.sheets.set(sheet.id, { id: sheet.id, name, batchQty, lines: drafts.map(toLine) });
    const r = computeSheet(sheet.id, catalog);
    return { result: r, lineResults: r.lines };
  }, [materials, workCenters, sheets, sheet.id, name, batchQty, drafts]);

  const liveInputs = { ...inputs, marginBps: Math.round(n(marginPct) * 100) };
  const suggestion = suggestPrice(result.unitCents, liveInputs);
  const product = products.find((p) => p.id === productId);
  const currentMargin = product?.priceCents ? marginAtPrice(product.priceCents, result.unitCents, inputs) : null;
  const simCents = Math.round((parseDecimal(simPrice, true) ?? 0) * 100);
  const simMargin = simCents > 0 ? marginAtPrice(simCents, result.unitCents, inputs) : null;

  const payload = () => ({ name, batchQty, ncm: ncm || null, notes: notes || null, productId: productId || null, lines: drafts.map(toLine) });
  const save = (then?: () => Promise<void>) => start(async () => {
    const res = await saveSheet(sheet.id, payload());
    if ('error' in res) { toast(res.error, 'error'); return; }
    setDirty(false);
    if (then) await then(); else toast(res.message ?? 'Salvo.');
    router.refresh();
  });
  const applyPrice = (cents: number) => save(async () => {
    const res = await applyPriceToProduct(sheet.id, cents);
    toast('error' in res ? res.error : (res.message ?? 'Preço aplicado.'), 'error' in res ? 'error' : 'success');
  });

  const materialOptions = (kind: LineKind) => materials.filter((m) =>
    kind === 'MATERIAL' ? ['BARRA_REDONDA', 'TUBO', 'INSUMO'].includes(m.kind) : kind === 'COMPONENTE' ? m.kind === 'COMPONENTE' : kind === 'SERVICO' ? m.kind === 'SERVICO' : false);
  const pctFmt = (bps: number | null) => (bps == null ? '—' : `${(bps / 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`);
  const marginTone = (bps: number | null) => (bps == null ? '' : bps < 0 ? 'text-red-600' : bps < 800 ? 'text-amber-700' : 'text-le-success');

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[1fr_22rem]">
      <div className="space-y-4">
        <div className="grid gap-3 rounded-2xl border border-le-line bg-white p-4 sm:grid-cols-6">
          <label className={`${labelCls} sm:col-span-3`}>Nome da ficha
            <input value={name} onChange={(e) => touch(setName)(e.target.value)} className={inputCls} />
          </label>
          <label className={`${labelCls} sm:col-span-3`}>Produto da vitrine (opcional)
            <select value={productId} onChange={(e) => touch(setProductId)(e.target.value)} className={inputCls}>
              <option value="">— subconjunto / sem produto —</option>
              {products.map((p) => <option key={p.id} value={p.id} disabled={Boolean(p.takenBy)}>{p.name}{p.takenBy ? ` (já na ficha ${p.takenBy})` : ''}</option>)}
            </select>
          </label>
          <label className={labelCls}>Lote (unidades)
            <input value={batch} onChange={(e) => touch(setBatch)(e.target.value)} inputMode="decimal" className={inputCls} />
          </label>
          <label className={labelCls}>NCM do produto
            <input value={ncm} onChange={(e) => touch(setNcm)(e.target.value)} inputMode="numeric" placeholder="8431.43.10" className={inputCls} />
          </label>
          <label className={`${labelCls} sm:col-span-4`}>Observações
            <input value={notes} onChange={(e) => touch(setNotes)(e.target.value)} placeholder="Ex.: medidas conforme desenho rev. B" className={inputCls} />
          </label>
        </div>

        <div className="space-y-2">
          {drafts.map((d, i) => {
            const r = lineResults[i];
            const mats = materialOptions(d.kind);
            const m = materials.find((x) => x.id === d.materialId);
            const steel = m && (m.kind === 'BARRA_REDONDA' || m.kind === 'TUBO');
            const kindLabel = KIND_OPTIONS.find((k) => k.kind === d.kind)!.label;
            return (
              <div key={d.key} className="rounded-2xl border border-le-line bg-white p-3">
                <div className="flex flex-wrap items-end gap-2">
                  <span className="mb-2 w-24 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-le-blue">{kindLabel}</span>
                  {(d.kind === 'MATERIAL' || d.kind === 'COMPONENTE' || d.kind === 'SERVICO') && (
                    <label className={`${labelCls} min-w-48 flex-[2]`}>{d.kind === 'MATERIAL' ? 'Material' : d.kind === 'COMPONENTE' ? 'Componente' : 'Serviço'}
                      <select value={d.materialId} onChange={(e) => update(d.key, { materialId: e.target.value })} className={inputCls}>
                        <option value="">{d.kind === 'MATERIAL' ? 'Escolha…' : 'Escolha ou informe o custo →'}</option>
                        {mats.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                      </select>
                    </label>
                  )}
                  {d.kind === 'PROCESSO' && (
                    <label className={`${labelCls} min-w-48 flex-[2]`}>Processo
                      <select value={d.workCenterId} onChange={(e) => update(d.key, { workCenterId: e.target.value })} className={inputCls}>
                        <option value="">Escolha…</option>
                        {workCenters.map((w) => <option key={w.id} value={w.id}>{w.name} · {formatCurrency(w.rateCentsPerHour)}/h</option>)}
                      </select>
                    </label>
                  )}
                  {d.kind === 'SUBFICHA' && (
                    <label className={`${labelCls} min-w-48 flex-[2]`}>Ficha do subconjunto
                      <select value={d.subSheetId} onChange={(e) => update(d.key, { subSheetId: e.target.value })} className={inputCls}>
                        <option value="">Escolha…</option>
                        {sheets.filter((s) => s.id !== sheet.id).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </label>
                  )}
                  {(d.kind === 'OUTRO' || d.kind === 'COMPONENTE' || d.kind === 'SERVICO') && (
                    <label className={`${labelCls} w-44`}>Descrição
                      <input value={d.description} onChange={(e) => update(d.key, { description: e.target.value })} className={inputCls} />
                    </label>
                  )}
                  {steel && (
                    <label className={`${labelCls} w-28`}>Comprimento (mm)
                      <input value={d.lengthMm} onChange={(e) => update(d.key, { lengthMm: e.target.value })} inputMode="decimal" className={inputCls} />
                    </label>
                  )}
                  {d.kind === 'PROCESSO' && (
                    <label className={`${labelCls} w-24`}>Minutos
                      <input value={d.minutes} onChange={(e) => update(d.key, { minutes: e.target.value })} inputMode="decimal" className={inputCls} />
                    </label>
                  )}
                  <label className={`${labelCls} w-24`}>{steel ? 'Peças' : m?.unit === 'KG' ? 'Qtd (kg)' : d.kind === 'PROCESSO' ? 'Vezes' : 'Qtd'}
                    <input value={d.quantity} onChange={(e) => update(d.key, { quantity: e.target.value })} inputMode="decimal" className={inputCls} />
                  </label>
                  {(d.kind === 'MATERIAL' || d.kind === 'COMPONENTE') && (
                    <label className={`${labelCls} w-20`}>Perda %
                      <input value={d.scrapPct} onChange={(e) => update(d.key, { scrapPct: e.target.value })} inputMode="decimal" className={inputCls} />
                    </label>
                  )}
                  {d.kind !== 'SUBFICHA' && (
                    <label className={`${labelCls} w-28`}>{d.kind === 'PROCESSO' ? 'R$/h (manual)' : m?.unit === 'KG' ? 'R$/kg (manual)' : 'Custo unit. R$'}
                      <input value={d.unitCost} onChange={(e) => update(d.key, { unitCost: e.target.value })} inputMode="decimal"
                        placeholder={d.kind === 'PROCESSO' ? '' : m ? (m.unitCostCents / 100).toFixed(2).replace('.', ',') : ''} className={inputCls} />
                    </label>
                  )}
                  <div className="ml-auto flex items-center gap-1 pb-0.5">
                    <p className="mr-2 w-28 text-right font-heading text-sm font-semibold tabular-nums">{formatCurrency(r?.cents ?? 0)}</p>
                    <button type="button" aria-label="Subir" onClick={() => move(d.key, -1)} className="rounded p-1 text-le-muted hover:text-le-text"><ArrowUp className="h-4 w-4" /></button>
                    <button type="button" aria-label="Descer" onClick={() => move(d.key, 1)} className="rounded p-1 text-le-muted hover:text-le-text"><ArrowDown className="h-4 w-4" /></button>
                    <button type="button" aria-label="Remover linha" onClick={() => remove(d.key)} className="rounded p-1 text-le-muted hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                <p className={cn('mt-1.5 pl-26 text-[11px]', r?.warning ? 'text-amber-700' : 'text-le-muted')}>
                  {r?.warning ? <><AlertTriangle className="mr-1 inline h-3 w-3" />{r.warning}</> : r?.detail}
                </p>
              </div>
            );
          })}
          <div className="flex flex-wrap gap-2 rounded-2xl border border-dashed border-le-line p-3">
            <span className="mr-1 self-center text-xs text-le-muted">Adicionar:</span>
            {KIND_OPTIONS.map((k) => (
              <button key={k.kind} type="button" onClick={() => add(k.kind)} title={k.hint}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-le-line bg-white px-2.5 text-xs font-medium hover:border-le-blue hover:text-le-blue">
                <Plus className="h-3.5 w-3.5" /> {k.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-24">
        <div className="rounded-2xl border border-le-line bg-white p-4">
          <p className="text-xs text-le-muted">Custo por unidade{batchQty !== 1 ? ` (lote de ${batchQty})` : ''}</p>
          <p className="font-heading text-3xl font-semibold tabular-nums tracking-[-0.04em]">{formatCurrency(result.unitCents)}</p>
          <p className="text-xs text-le-muted">{result.kgPerUnit > 0 ? `${result.kgPerUnit.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg de aço por unidade` : 'sem aço calculado'}</p>
          <dl className="mt-3 space-y-1 text-sm">
            {(Object.keys(CATEGORY_LABELS) as Category[]).filter((c) => result.unitByCategory[c] > 0).map((c) => (
              <div key={c} className="flex justify-between">
                <dt className="text-le-muted">{CATEGORY_LABELS[c]}</dt>
                <dd className="tabular-nums">{formatCurrency(Math.round(result.unitByCategory[c]))} <span className="text-[11px] text-le-muted">{result.unitCents ? `${Math.round((result.unitByCategory[c] / result.unitCents) * 100)}%` : ''}</span></dd>
              </div>
            ))}
          </dl>
          {result.warnings.length > 0 && <p className="mt-3 rounded-lg bg-amber-500/10 px-2.5 py-2 text-xs text-amber-800">{result.warnings.length} pendência(s): o custo pode estar incompleto.</p>}
        </div>

        <div className="rounded-2xl border border-le-line bg-white p-4">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-xs text-le-muted">Preço sugerido</p>
              <p className="font-heading text-3xl font-semibold tabular-nums tracking-[-0.04em] text-le-blue">{suggestion.ok ? formatCurrency(suggestion.priceCents) : '—'}</p>
            </div>
            <label className={`${labelCls} w-24`}>Margem %
              <input value={marginPct} onChange={(e) => setMarginPct(e.target.value)} inputMode="decimal" className={inputCls} />
            </label>
          </div>
          {suggestion.ok ? (
            <dl className="mt-3 space-y-1 text-xs">
              {[
                [`Impostos (DAS ${pctFmt(inputs.dasBps)}${inputs.taxBps !== (inputs.dasBps ?? 0) ? ' + outros' : ''})`, suggestion.breakdown.taxCents],
                ['Comissão', suggestion.breakdown.commissionCents],
                ['Taxa de pagamento', suggestion.breakdown.paymentFeeCents],
                ['Despesas fixas', suggestion.breakdown.fixedExpenseCents],
                ['Lucro', suggestion.breakdown.profitCents],
              ].map(([l, v]) => <div key={l as string} className="flex justify-between"><dt className="text-le-muted">{l}</dt><dd className="tabular-nums">{formatCurrency(v as number)}</dd></div>)}
              <p className="pt-1 text-le-muted">Mark-up × {suggestion.markup.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}</p>
            </dl>
          ) : <p className="mt-2 text-xs text-amber-700">{suggestion.reason}</p>}

          <div className="mt-4 space-y-2 border-t border-le-line pt-3 text-sm">
            {product ? (
              <p className="flex justify-between"><span className="text-le-muted">Preço atual na vitrine</span>
                <span className="tabular-nums">{product.priceCents ? formatCurrency(product.priceCents) : 'sob cotação'} {currentMargin != null && <span className={`ml-1 text-xs font-semibold ${marginTone(currentMargin)}`}>margem {pctFmt(currentMargin)}</span>}</span>
              </p>
            ) : <p className="text-xs text-le-muted">Ligue a ficha a um produto para aplicar o preço na vitrine.</p>}
            <label className={labelCls}>Simular outro preço (R$)
              <input value={simPrice} onChange={(e) => setSimPrice(e.target.value)} inputMode="decimal" placeholder="Ex.: 450,00" className={inputCls} />
            </label>
            {simMargin != null && <p className={`text-xs font-semibold ${marginTone(simMargin)}`}>Margem líquida nesse preço: {pctFmt(simMargin)}</p>}
            {product && suggestion.ok && (
              <button type="button" disabled={pending} onClick={() => applyPrice(simCents > 0 ? simCents : suggestion.priceCents)}
                className="h-9 w-full rounded-lg border border-le-blue text-sm font-semibold text-le-blue hover:bg-le-tint disabled:opacity-60">
                Aplicar {formatCurrency(simCents > 0 ? simCents : suggestion.priceCents)} no produto
              </button>
            )}
          </div>
        </div>

        <button type="button" disabled={pending} onClick={() => save()}
          className="h-11 w-full rounded-xl bg-le-blue text-sm font-semibold text-white shadow-sm hover:bg-le-blue-hover disabled:opacity-60">
          {pending ? 'Salvando…' : dirty ? 'Salvar ficha' : 'Ficha salva'}
        </button>
        {dirty && <p className="text-center text-[11px] text-amber-700">Alterações ainda não salvas.</p>}
      </aside>
    </div>
  );
}
