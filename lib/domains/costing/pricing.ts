// Formação de preço (puro). Método do mark-up divisor, usual para Simples Nacional:
//   preço = custo ÷ (1 − Σ percentuais sobre a venda)
// Σ = DAS efetivo + outros impostos + comissão + taxa de pagamento + despesas fixas + margem.
// Todos os percentuais em pontos-base (bps): 100 bps = 1%.

export type SimplesBracket = { upTo: number; nominalBps: number; deductCents: number };

/**
 * Simples Nacional — Anexo II (indústria), LC 123/2006 com redação da LC 155/2016.
 * Vigente em 2026; a reforma tributária altera o Simples a partir de 2027: confirmar com o contador.
 */
export const SIMPLES_ANEXO_II: SimplesBracket[] = [
  { upTo: 180_000_00, nominalBps: 450, deductCents: 0 },
  { upTo: 360_000_00, nominalBps: 780, deductCents: 5_940_00 },
  { upTo: 720_000_00, nominalBps: 1000, deductCents: 13_860_00 },
  { upTo: 1_800_000_00, nominalBps: 1120, deductCents: 22_500_00 },
  { upTo: 3_600_000_00, nominalBps: 1470, deductCents: 85_500_00 },
  { upTo: 4_800_000_00, nominalBps: 3000, deductCents: 720_000_00 },
];

/**
 * Alíquota efetiva do DAS (bps) = (RBT12 × nominal − parcela a deduzir) ÷ RBT12.
 * Sem faturamento informado usa a 1ª faixa (4,5%). Acima do teto do Simples: null.
 */
export function simplesEffectiveBps(rbt12Cents: number, table = SIMPLES_ANEXO_II): number | null {
  const rbt = Math.max(0, rbt12Cents);
  if (rbt === 0) return table[0].nominalBps;
  const bracket = table.find((b) => rbt <= b.upTo);
  if (!bracket) return null;
  const effective = (rbt * (bracket.nominalBps / 10_000) - bracket.deductCents) / rbt;
  return Math.round(effective * 10_000);
}

export type PriceInputs = {
  taxBps: number; // DAS efetivo + outros impostos sobre a venda
  commissionBps: number;
  paymentFeeBps: number; // taxa do PIX/cartão/boleto
  fixedExpenseBps: number; // despesas fixas ÷ faturamento
  marginBps: number; // lucro líquido desejado
};

export type PriceResult =
  | {
      ok: true;
      priceCents: number;
      markup: number; // multiplicador sobre o custo
      breakdown: { costCents: number; taxCents: number; commissionCents: number; paymentFeeCents: number; fixedExpenseCents: number; profitCents: number };
    }
  | { ok: false; reason: string };

const sumBps = (p: PriceInputs) => p.taxBps + p.commissionBps + p.paymentFeeBps + p.fixedExpenseBps + p.marginBps;

export function suggestPrice(costCents: number, p: PriceInputs): PriceResult {
  if (!(costCents > 0)) return { ok: false, reason: 'Sem custo calculado.' };
  const total = sumBps(p);
  if (total >= 10_000) return { ok: false, reason: 'A soma de impostos, comissão, despesas e margem chega a 100% ou mais.' };
  const priceCents = Math.round(costCents / (1 - total / 10_000));
  const pct = (bps: number) => Math.round((priceCents * bps) / 10_000);
  const taxCents = pct(p.taxBps);
  const commissionCents = pct(p.commissionBps);
  const paymentFeeCents = pct(p.paymentFeeBps);
  const fixedExpenseCents = pct(p.fixedExpenseBps);
  // O lucro fecha a conta (evita diferença de centavos por arredondamento)
  const profitCents = priceCents - costCents - taxCents - commissionCents - paymentFeeCents - fixedExpenseCents;
  return { ok: true, priceCents, markup: priceCents / costCents, breakdown: { costCents, taxCents, commissionCents, paymentFeeCents, fixedExpenseCents, profitCents } };
}

/** Margem líquida real (bps) de um preço praticado, dados custo e percentuais (sem a margem). */
export function marginAtPrice(priceCents: number, costCents: number, p: Omit<PriceInputs, 'marginBps'>) {
  if (!(priceCents > 0)) return null;
  const variableBps = p.taxBps + p.commissionBps + p.paymentFeeBps + p.fixedExpenseBps;
  const profit = priceCents - costCents - (priceCents * variableBps) / 10_000;
  return Math.round((profit / priceCents) * 10_000);
}

/**
 * Custo-hora de mão de obra: (salário × (1 + encargos)) ÷ horas produtivas no mês.
 * Encargos no Simples (Anexo II, CPP dentro do DAS): FGTS + provisões de 13º e férias ≈ 36%.
 */
export function laborHourCents(input: { salaryCents: number; chargesBps?: number; monthlyHours?: number; efficiencyBps?: number; machineHourCents?: number }) {
  const hours = (input.monthlyHours ?? 176) * ((input.efficiencyBps ?? 8000) / 10_000);
  if (!(hours > 0)) return 0;
  const people = (input.salaryCents * (1 + (input.chargesBps ?? 3600) / 10_000)) / hours;
  return Math.round(people + (input.machineHourCents ?? 0));
}

export const bpsToPercent = (bps: number) => bps / 100;
export const percentToBps = (percent: number) => Math.round(percent * 100);
