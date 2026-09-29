'use client';

import { useState } from 'react';
import { Copy, Plus, Trash2 } from 'lucide-react';
import { parseDecimal } from '@/lib/domains/costing/steel';
import { buildQuoteSummary, calculateQuote } from '@/lib/domains/costing/quote';
import type { MaterialInput, WorkCenterInput } from '@/lib/domains/costing/rollup';
import type { PriceInputs } from '@/lib/domains/costing/pricing';
import { formatCurrency } from '@/lib/format';
import { inputCls, labelCls } from './ActionForm';

type ProcessLine = { id: number; workCenterId: string; minutes: string };
export function QuickQuote({ materials, workCenters, pricing }: {
  materials: MaterialInput[]; workCenters: WorkCenterInput[]; pricing: PriceInputs & { dasBps: number | null };
}) {
  const [materialId, setMaterialId] = useState(materials[0]?.id ?? '');
  const [length, setLength] = useState('250');
  const [quantity, setQuantity] = useState('1');
  const [scrap, setScrap] = useState('5');
  const [service, setService] = useState('');
  const [processes, setProcesses] = useState<ProcessLine[]>([]);
  const [copiedSummary, setCopiedSummary] = useState('');
  const [copyError, setCopyError] = useState(false);
  const material = materials.find((m) => m.id === materialId);
  const lengthMm = parseDecimal(length) ?? NaN;
  const qty = parseDecimal(quantity) ?? NaN;
  const scrapPercent = parseDecimal(scrap) ?? NaN;
  const serviceCents = Math.round((service.trim() ? parseDecimal(service) ?? NaN : 0) * 100);
  const resolved = processes.map((p) => ({ workCenter: workCenters.find((w) => w.id === p.workCenterId)!, minutes: parseDecimal(p.minutes) ?? NaN }));
  const result = material && resolved.every((p) => p.workCenter) ? calculateQuote({ material, lengthMm, quantity: qty, scrapPercent, serviceCents, processes: resolved, pricing }) : null;
  const suggestion = pricing.dasBps === null ? null : result?.suggestion;
  const price = suggestion?.ok ? suggestion.priceCents : null;
  const summary = result && material && price !== null ? buildQuoteSummary({ materialName: material.name, diameterMm: material.diameterMm ?? 0, wallMm: material.wallMm, lengthMm, quantity: qty, scrapPercent, kg: result.kg, priceCents: price }) : '';
  const editProcess = (id: number, patch: Partial<ProcessLine>) => setProcesses((lines) => lines.map((p) => p.id === id ? { ...p, ...patch } : p));

  return (
    <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-5 rounded-2xl border border-le-line bg-white p-4 sm:p-5">
        {!materials.length && <p role="status" className="text-sm text-le-muted">Cadastre uma barra ou tubo com custo por kg ou metro em Materiais para começar.</p>}
        <label className={labelCls}>Material
          <select className={inputCls} value={materialId} onChange={(e) => setMaterialId(e.target.value)}>
            {!materials.length && <option value="">Nenhum material cadastrado</option>}
            {materials.map((m) => <option key={m.id} value={m.id}>{m.name} — {formatCurrency(m.unitCostCents)}/{m.unit.toLowerCase()}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <label className={labelCls}>Comprimento (mm)<input className={inputCls} inputMode="decimal" value={length} onChange={(e) => setLength(e.target.value)} /></label>
          <label className={labelCls}>Quantidade de peças<input className={inputCls} inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></label>
          <label className={labelCls}>Perda (%)<input className={inputCls} inputMode="decimal" value={scrap} onChange={(e) => setScrap(e.target.value)} /></label>
        </div>
        <fieldset className="space-y-3">
          <legend className="mb-2 text-sm font-semibold">Processos do lote (opcional)</legend>
          {processes.map((p, index) => <div key={p.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_44px] items-end gap-2">
            <label className={labelCls}>Processo {index + 1}<select className={inputCls} value={p.workCenterId} onChange={(e) => editProcess(p.id, { workCenterId: e.target.value })}>
              {workCenters.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select></label>
            <label className={labelCls}>Minutos no lote<input className={inputCls} inputMode="decimal" value={p.minutes} onChange={(e) => editProcess(p.id, { minutes: e.target.value })} /></label>
            <button type="button" aria-label={`Remover processo ${index + 1}`} onClick={() => setProcesses((lines) => lines.filter((line) => line.id !== p.id))} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-le-line"><Trash2 size={16} /></button>
          </div>)}
          <button type="button" disabled={!workCenters.length} onClick={() => setProcesses((lines) => [...lines, { id: (lines.at(-1)?.id ?? 0) + 1, workCenterId: workCenters[0].id, minutes: '' }])} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-le-line px-3 text-sm disabled:opacity-50"><Plus size={16} aria-hidden />Adicionar processo</button>
          {!workCenters.length && <p className="text-xs text-le-muted">Cadastre processos para incluir mão de obra.</p>}
        </fieldset>
        <label className={labelCls}>Serviço avulso do lote (R$)<input className={inputCls} inputMode="decimal" placeholder="0,00" value={service} onChange={(e) => setService(e.target.value)} /></label>
      </div>
      <section aria-label="Resumo da cotação" className="min-w-0 self-start rounded-2xl border border-le-line bg-white p-5">
        <h2 className="font-semibold">Resumo do lote</h2>
        <dl className="mt-4 space-y-3 text-sm">
          {[
            ['Peso total com perda', result ? `${result.kg.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg` : '—'],
            ['Custo do aço', result ? formatCurrency(result.steelCents) : '—'],
            ['Custo dos processos', result ? formatCurrency(result.processCents) : '—'],
            ['Serviço avulso', result ? formatCurrency(serviceCents) : '—'],
            ['Custo total', result ? formatCurrency(result.totalCents) : '—'],
            ['Preço sugerido', price !== null ? formatCurrency(price) : '—'],
            ['Preço de venda por kg', price !== null && result ? formatCurrency(Math.round(price / result.kg)) : '—'],
          ].map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-2"><dt className="text-le-muted">{label}</dt><dd className="font-semibold tabular-nums">{value}</dd></div>)}
        </dl>
        {!result && <p role="status" className="mt-4 text-sm text-amber-800">Informe medidas e quantidade positivas, perda e serviço não negativos e custos cadastrados maiores que zero.</p>}
        {pricing.dasBps === null && <p role="status" className="mt-4 text-sm text-amber-800">Revise o DAS em Impostos e margem antes de sugerir o preço.</p>}
        {suggestion && !suggestion.ok && <p role="status" className="mt-4 text-sm text-amber-800">{suggestion.reason}</p>}
        <button type="button" disabled={!summary} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-le-blue px-4 text-sm font-semibold text-white disabled:opacity-50" onClick={async () => {
          setCopyError(false);
          try { await navigator.clipboard.writeText(summary); setCopiedSummary(summary); }
          catch (error) { console.error('Falha ao copiar cotação', error); setCopyError(true); }
        }}><Copy size={16} aria-hidden />Copiar resumo</button>
        <p role="status" className="mt-2 text-xs text-le-muted">{copyError ? 'Não foi possível copiar. Tente novamente.' : summary && copiedSummary === summary ? 'Resumo copiado.' : 'Simulação sem gravação.'}</p>
      </section>
    </div>
  );
}
