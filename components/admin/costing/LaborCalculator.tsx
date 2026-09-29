'use client';

import { useState } from 'react';
import { laborHourCents } from '@/lib/domains/costing/pricing';
import { parseDecimal } from '@/lib/domains/costing/steel';
import { formatCurrency } from '@/lib/format';
import { inputCls, labelCls } from './ActionForm';

/** Calculadora de custo-hora para preencher os processos. Não grava nada. */
export function LaborCalculator({ avgSalaryCents }: { avgSalaryCents: number }) {
  const [salary, setSalary] = useState(avgSalaryCents ? (avgSalaryCents / 100).toFixed(2).replace('.', ',') : '3.000,00');
  const [charges, setCharges] = useState('36');
  const [hours, setHours] = useState('176');
  const [efficiency, setEfficiency] = useState('80');
  const [machine, setMachine] = useState('0');
  const n = (v: string, t = false) => parseDecimal(v, t) ?? 0;
  const cents = laborHourCents({
    salaryCents: Math.round(n(salary, true) * 100), chargesBps: Math.round(n(charges) * 100),
    monthlyHours: n(hours), efficiencyBps: Math.round(n(efficiency) * 100), machineHourCents: Math.round(n(machine, true) * 100),
  });
  return (
    <div className="rounded-2xl border border-le-line bg-le-subtle/60 p-4">
      <h2 className="font-heading text-base font-medium">Calculadora de custo-hora</h2>
      <p className="mt-1 text-xs text-le-muted">
        (salário × (1 + encargos)) ÷ (horas no mês × aproveitamento) + custo da máquina por hora.
        {avgSalaryCents ? ` Salário inicial = média dos funcionários cadastrados (${formatCurrency(avgSalaryCents)}).` : ''}
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-5">
        <label className={labelCls}>Salário (R$)<input value={salary} onChange={(e) => setSalary(e.target.value)} inputMode="decimal" className={inputCls} /></label>
        <label className={labelCls}>Encargos (%)<input value={charges} onChange={(e) => setCharges(e.target.value)} inputMode="decimal" className={inputCls} /></label>
        <label className={labelCls}>Horas/mês<input value={hours} onChange={(e) => setHours(e.target.value)} inputMode="decimal" className={inputCls} /></label>
        <label className={labelCls}>Aproveitamento (%)<input value={efficiency} onChange={(e) => setEfficiency(e.target.value)} inputMode="decimal" className={inputCls} /></label>
        <label className={labelCls}>Máquina (R$/h)<input value={machine} onChange={(e) => setMachine(e.target.value)} inputMode="decimal" className={inputCls} /></label>
      </div>
      <p className="mt-3 text-sm">Custo-hora: <strong className="font-heading text-lg">{formatCurrency(cents)}</strong></p>
      <p className="mt-1 text-[11px] text-le-muted">
        Encargos ≈ 36% no Simples (Anexo II): FGTS 8% + provisão de 13º e férias com FGTS. A contribuição patronal (CPP) já está no DAS.
        Máquina: some depreciação, energia e manutenção por hora de uso. Confirme os percentuais com o contador.
      </p>
    </div>
  );
}
