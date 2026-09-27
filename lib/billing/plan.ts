// Regras de parcelamento com entrada — puro, usado no simulador (cliente) e
// revalidado no servidor. Ajuste a política comercial aqui.

export const BILLING_RULES = {
  /** Entrada mínima sobre o saldo do pedido. */
  minDownPercent: 45,
  /** Máximo de boletos após a entrada. */
  maxInstallments: 5,
  /** Menor valor aceito por parcela (R$ 200,00). */
  minInstallmentCents: 20_000,
  /** Multa por atraso (%): o CDC limita a 2%. */
  finePercent: 2,
  /** Juros de mora ao mês (%): 1% a.m. é o usual. */
  interestPercent: 1,
  /** Mais parcelas conforme o valor do saldo. */
  tiers: [
    { fromCents: 0, maxInstallments: 2 },
    { fromCents: 500_000, maxInstallments: 3 }, // a partir de R$ 5.000
    { fromCents: 1_500_000, maxInstallments: 5 }, // a partir de R$ 15.000
  ],
} as const;

export interface CustomerCredit {
  paidOrders: number; // pedidos 100% quitados
  paidCents: number; // total já pago na história
  overdueCount: number; // cobranças vencidas em aberto agora
}

export interface Eligibility {
  eligible: boolean;
  maxInstallments: number;
  reasons: string[]; // por que (não) pode — mostrado ao vendedor
}

/** "Contador" do sistema: decide se e em quantas vezes o cliente pode parcelar. */
export function evaluateEligibility(balanceCents: number, credit: CustomerCredit): Eligibility {
  const reasons: string[] = [];
  const tier = [...BILLING_RULES.tiers].reverse().find((t) => balanceCents >= t.fromCents)!;
  let max = Math.min(tier.maxInstallments, BILLING_RULES.maxInstallments);
  // Nunca gerar parcela abaixo do mínimo
  const remainderAtMinDown = Math.floor((balanceCents * (100 - BILLING_RULES.minDownPercent)) / 100);
  max = Math.max(0, Math.min(max, Math.floor(remainderAtMinDown / BILLING_RULES.minInstallmentCents)));

  if (credit.overdueCount > 0) reasons.push(`Possui ${credit.overdueCount} cobrança(s) vencida(s) em aberto.`);
  if (credit.paidOrders === 0) reasons.push('Ainda não tem compra quitada (primeira compra).');
  else reasons.push(`${credit.paidOrders} compra(s) quitada(s) no histórico.`);
  if (max === 0) reasons.push('Saldo baixo demais para parcelar (parcela mínima de R$ 200,00).');
  else reasons.push(`Pelo valor, até ${max}x no boleto após a entrada.`);

  return { eligible: credit.paidOrders > 0 && credit.overdueCount === 0 && max > 0, maxInstallments: max, reasons };
}

export const minDownCents = (balanceCents: number) => Math.ceil((balanceCents * BILLING_RULES.minDownPercent) / 100);

function addMonthsIso(date: string, n: number) {
  const [y, m, d] = date.split('-').map(Number);
  const last = new Date(y, m - 1 + n + 1, 0).getDate();
  const t = new Date(y, m - 1 + n, Math.min(d, last));
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

export interface PlanLine {
  label: string;
  amountCents: number;
  dueDate: string; // AAAA-MM-DD
  kind: 'ENTRADA' | 'PARCELA';
}

/**
 * Monta o plano: entrada + N parcelas mensais iguais (centavos que sobram vão
 * para a última). A 1ª parcela vence em `firstInstallmentDate`.
 */
export function buildPlan({ balanceCents, downCents, installments, downDueDate, firstInstallmentDate }: {
  balanceCents: number; downCents: number; installments: number; downDueDate: string; firstInstallmentDate: string;
}): { lines: PlanLine[]; error?: string } {
  if (installments < 1 || installments > BILLING_RULES.maxInstallments) return { lines: [], error: `Escolha de 1 a ${BILLING_RULES.maxInstallments} parcelas.` };
  if (downCents < minDownCents(balanceCents)) return { lines: [], error: `A entrada mínima é ${BILLING_RULES.minDownPercent}% do saldo.` };
  if (downCents >= balanceCents) return { lines: [], error: 'A entrada cobre todo o saldo — cobre à vista.' };
  const remainder = balanceCents - downCents;
  const each = Math.floor(remainder / installments);
  if (each < BILLING_RULES.minInstallmentCents) return { lines: [], error: 'Parcela abaixo do mínimo de R$ 200,00: reduza o nº de parcelas.' };
  if (firstInstallmentDate <= downDueDate) return { lines: [], error: 'A 1ª parcela deve vencer depois da entrada.' };

  const lines: PlanLine[] = [{ label: 'Entrada', amountCents: downCents, dueDate: downDueDate, kind: 'ENTRADA' }];
  for (let i = 0; i < installments; i++) {
    lines.push({
      label: `Parcela ${i + 1}/${installments}`,
      amountCents: i === installments - 1 ? remainder - each * (installments - 1) : each,
      dueDate: addMonthsIso(firstInstallmentDate, i),
      kind: 'PARCELA',
    });
  }
  return { lines };
}
