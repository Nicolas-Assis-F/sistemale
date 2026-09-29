'use client';

import { useState } from 'react';
import { saveMaterial } from '@/app/admin/custos/_actions';
import { kgPerMeter, parseDecimal, parseInches, TUBE_SIZES, BAR_SIZES } from '@/lib/domains/costing/steel';
import { ActionForm, inputCls, labelCls } from './ActionForm';

type Kind = 'BARRA_REDONDA' | 'TUBO' | 'COMPONENTE' | 'SERVICO' | 'INSUMO';
export type MaterialDefaults = {
  id?: string; name?: string; kind?: Kind; grade?: string | null; sizeLabel?: string | null;
  diameterMm?: number | null; wallMm?: number | null; unit?: 'KG' | 'M' | 'UN'; unitCost?: string;
  ncm?: string | null; supplier?: string | null; notes?: string | null;
};

const KIND_LABELS: Record<Kind, string> = {
  BARRA_REDONDA: 'Barra redonda maciça', TUBO: 'Tubo', COMPONENTE: 'Componente comprado pronto', SERVICO: 'Serviço terceirizado', INSUMO: 'Insumo/consumível',
};
const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function MaterialForm({ defaults = {}, onDone }: { defaults?: MaterialDefaults; onDone?: () => void }) {
  const [kind, setKind] = useState<Kind>(defaults.kind ?? 'BARRA_REDONDA');
  const [diameter, setDiameter] = useState(defaults.diameterMm != null ? String(defaults.diameterMm).replace('.', ',') : '');
  const [wall, setWall] = useState(defaults.wallMm != null ? String(defaults.wallMm).replace('.', ',') : '');
  const [unit, setUnit] = useState(defaults.unit ?? 'KG');
  const [cost, setCost] = useState(defaults.unitCost ?? '');
  const steel = kind === 'BARRA_REDONDA' || kind === 'TUBO';
  const d = parseDecimal(diameter) ?? 0;
  const w = parseDecimal(wall) ?? 0;
  const kgm = steel ? kgPerMeter(kind, d, w) : 0;
  const unitCost = parseDecimal(cost, true) ?? 0;

  const preset = (value: string) => {
    if (!value) return;
    const [type, idx, sch] = value.split(':');
    if (type === 'bar') {
      setKind('BARRA_REDONDA');
      setDiameter(BAR_SIZES[Number(idx)].diameterMm.toFixed(3).replace('.', ','));
      setWall('');
    } else {
      const t = TUBE_SIZES[Number(idx)];
      setKind('TUBO');
      setDiameter(String(t.odMm).replace('.', ','));
      setWall(String(t.walls[Number(sch)].wallMm).replace('.', ','));
    }
    setUnit('KG');
  };

  return (
    <ActionForm action={saveMaterial.bind(null, defaults.id ?? null)} onDone={onDone} resetOnSuccess={!defaults.id}
      className="grid gap-3 rounded-2xl border border-le-line bg-white p-4 sm:grid-cols-6">
      <label className={`${labelCls} sm:col-span-3`}>Nome
        <input name="name" required defaultValue={defaults.name ?? ''} placeholder='Ex.: Barra redonda SAE 1045 3 1/2"' className={inputCls} />
      </label>
      <label className={`${labelCls} sm:col-span-2`}>Tipo
        <select name="kind" value={kind} onChange={(e) => { const k = e.target.value as Kind; setKind(k); setUnit(k === 'BARRA_REDONDA' || k === 'TUBO' ? 'KG' : 'UN'); }} className={inputCls}>
          {(Object.keys(KIND_LABELS) as Kind[]).map((k) => <option key={k} value={k}>{KIND_LABELS[k]}</option>)}
        </select>
      </label>
      <label className={labelCls}>Medida pronta
        <select defaultValue="" onChange={(e) => preset(e.target.value)} className={inputCls}>
          <option value="">—</option>
          <optgroup label="Barra SAE 1045">{BAR_SIZES.map((b, i) => <option key={b.label} value={`bar:${i}`}>{b.label}</option>)}</optgroup>
          {TUBE_SIZES.map((t, i) => (
            <optgroup key={t.label} label={`Tubo ${t.label}`}>
              {t.walls.map((wl, j) => <option key={wl.schedule} value={`tube:${i}:${j}`}>{t.label} {wl.schedule}</option>)}
            </optgroup>
          ))}
        </select>
      </label>

      {steel && (
        <>
          <label className={`${labelCls} sm:col-span-2`}>{kind === 'TUBO' ? 'Diâmetro externo (mm)' : 'Diâmetro (mm)'}
            <input name="diameterMm" value={diameter} onChange={(e) => setDiameter(e.target.value)} inputMode="decimal" placeholder='mm (ou digite 2 3/8" e saia do campo)'
              onBlur={(e) => { if (/\/|"/.test(e.target.value)) setDiameter(parseInches(e.target.value).toFixed(3).replace('.', ',')); }} className={inputCls} />
          </label>
          {kind === 'TUBO' && (
            <label className={labelCls}>Parede (mm)
              <input name="wallMm" value={wall} onChange={(e) => setWall(e.target.value)} inputMode="decimal" className={inputCls} />
            </label>
          )}
          <label className={labelCls}>Aço
            <input name="grade" defaultValue={defaults.grade ?? (kind === 'BARRA_REDONDA' ? 'SAE 1045' : 'ASTM A106/A53')} className={inputCls} />
          </label>
          <label className={`${labelCls} ${kind === 'TUBO' ? '' : 'sm:col-span-2'}`}>Medida (rótulo)
            <input name="sizeLabel" defaultValue={defaults.sizeLabel ?? ''} placeholder='2 7/8" SCH 80' className={inputCls} />
          </label>
        </>
      )}

      <label className={labelCls}>Comprado por
        <select name="unit" value={unit} onChange={(e) => setUnit(e.target.value as 'KG' | 'M' | 'UN')} className={inputCls}>
          <option value="KG">kg</option><option value="M">metro</option><option value="UN">unidade</option>
        </select>
      </label>
      <label className={labelCls}>Custo por {unit === 'KG' ? 'kg' : unit === 'M' ? 'metro' : 'unidade'} (R$)
        <input name="unitCost" value={cost} onChange={(e) => setCost(e.target.value)} inputMode="decimal" placeholder="9,00" className={inputCls} />
      </label>
      <label className={labelCls}>NCM
        <input name="ncm" defaultValue={defaults.ncm ?? ''} inputMode="numeric" maxLength={10} placeholder="7214.20.00" className={inputCls} />
      </label>
      <label className={`${labelCls} sm:col-span-2`}>Fornecedor
        <input name="supplier" defaultValue={defaults.supplier ?? ''} className={inputCls} />
      </label>
      <label className={`${labelCls} sm:col-span-1`}>Observação
        <input name="notes" defaultValue={defaults.notes ?? ''} className={inputCls} />
      </label>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-le-line pt-3 sm:col-span-6">
        <p className="text-sm text-le-muted">
          {steel && kgm > 0
            ? <>Peso: <strong className="text-le-text">{kgm.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg/m</strong>
                {unit === 'KG' && unitCost > 0 && <> · custo por metro: <strong className="text-le-text">{brl(kgm * unitCost)}</strong> · barra de 6 m: <strong className="text-le-text">{brl(kgm * unitCost * 6)}</strong></>}</>
            : steel ? 'Informe as medidas para ver o peso por metro.' : 'Custo usado diretamente nas fichas.'}
        </p>
        <button type="submit" className="h-9 rounded-lg bg-le-blue px-4 text-sm font-semibold text-white hover:bg-le-blue-hover">
          {defaults.id ? 'Salvar alterações' : 'Adicionar material'}
        </button>
      </div>
    </ActionForm>
  );
}
