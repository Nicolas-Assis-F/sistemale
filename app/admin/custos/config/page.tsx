import { requireAdmin } from '@/lib/auth';
import { formatCurrency } from '@/lib/format';
import { CostingNav } from '@/components/admin/costing/CostingNav';
import { ActionForm, inputCls, labelCls } from '@/components/admin/costing/ActionForm';
import { defaultPricingProfile, priceInputs, pricingHints } from '@/lib/domains/costing/service';
import { SIMPLES_ANEXO_II, suggestPrice } from '@/lib/domains/costing/pricing';
import { savePricingProfile } from '../_actions';

const pct = (bps: number | null | undefined) => (bps == null ? '' : (bps / 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 }));

export default async function PricingConfigPage() {
  await requireAdmin(); // não depende só do proxy (defesa em profundidade)
  const [profile, hints] = await Promise.all([defaultPricingProfile(), pricingHints()]);
  const inputs = priceInputs(profile);
  const example = suggestPrice(100_00, inputs);
  const totalBps = inputs.taxBps + inputs.commissionBps + inputs.paymentFeeBps + inputs.fixedExpenseBps + inputs.marginBps;

  return (
    <div className="le-admin-page">
      <CostingNav active="/admin/custos/config" title="Impostos, despesas e margem"
        description="Percentuais que incidem sobre o preço de venda. O preço sugerido de cada ficha é: custo ÷ (1 − soma destes percentuais)." />

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <ActionForm action={savePricingProfile.bind(null, profile.id)} className="grid gap-4 rounded-2xl border border-le-line bg-white p-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <h2 className="font-heading text-base font-medium">Simples Nacional — Anexo II (indústria)</h2>
            <p className="text-xs text-le-muted">O DAS efetivo depende do faturamento bruto dos últimos 12 meses (RBT12).</p>
          </div>
          <label className={labelCls}>Faturamento últimos 12 meses (R$)
            <input name="rbt12" defaultValue={profile.rbt12Cents ? (profile.rbt12Cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''} inputMode="decimal" placeholder="500.000,00" className={inputCls} />
            <span className="block font-normal">
              {hints.rbt12Cents > 0 ? `Recebido pelo sistema em 12 meses: ${formatCurrency(hints.rbt12Cents)} (pode não incluir vendas fora do sistema).` : 'Use o valor do último extrato do Simples (PGDAS).'}
            </span>
          </label>
          <label className={labelCls}>DAS manual (%) — opcional
            <input name="dasOverride" defaultValue={pct(profile.dasOverrideBps)} inputMode="decimal" placeholder={`calculado: ${pct(inputs.dasBps)}%`} className={inputCls} />
            <span className="block font-normal">Preencha só se o contador informar outra alíquota efetiva.</span>
          </label>
          <label className={labelCls}>Outros impostos sobre a venda (%)
            <input name="otherTax" defaultValue={pct(profile.otherTaxBps)} inputMode="decimal" placeholder="0" className={inputCls} />
            <span className="block font-normal">Ex.: DIFAL/ST em vendas fora de GO, se o contador indicar.</span>
          </label>
          <label className={labelCls}>Comissão de venda (%)
            <input name="commission" defaultValue={pct(profile.commissionBps)} inputMode="decimal" className={inputCls} />
          </label>
          <label className={labelCls}>Taxa de pagamento (%)
            <input name="paymentFee" defaultValue={pct(profile.paymentFeeBps)} inputMode="decimal" className={inputCls} />
            <span className="block font-normal">Média das taxas do Asaas (PIX, boleto, cartão) sobre o valor vendido.</span>
          </label>
          <label className={labelCls}>Despesas fixas (% do faturamento)
            <input name="fixedExpense" defaultValue={pct(profile.fixedExpenseBps)} inputMode="decimal" className={inputCls} />
            <span className="block font-normal">
              {hints.fixedExpenseBps != null
                ? `Financeiro (90 dias): despesas ${formatCurrency(hints.expense3Cents)} ÷ recebido ${formatCurrency(hints.revenue3Cents)} = ${pct(hints.fixedExpenseBps)}%.`
                : 'Aluguel, energia, salários administrativos, contador… ÷ faturamento médio.'}
            </span>
          </label>
          <label className={labelCls}>Margem de lucro desejada (%)
            <input name="margin" defaultValue={pct(profile.marginBps)} inputMode="decimal" className={inputCls} />
            <span className="block font-normal">Lucro líquido que sobra depois de tudo.</span>
          </label>
          <div className="flex items-center justify-between gap-3 border-t border-le-line pt-4 sm:col-span-2">
            <p className="text-sm text-le-muted">Soma atual: <strong className={totalBps >= 7000 ? 'text-amber-700' : 'text-le-text'}>{pct(totalBps)}%</strong></p>
            <button type="submit" className="h-9 rounded-lg bg-le-blue px-4 text-sm font-semibold text-white">Salvar e recalcular fichas</button>
          </div>
        </ActionForm>

        <div className="space-y-4">
          <div className="rounded-2xl border border-le-line bg-white p-5">
            <h2 className="font-heading text-base font-medium">Como fica um item de custo R$ 100,00</h2>
            {example.ok ? (
              <dl className="mt-3 space-y-1.5 text-sm">
                {[
                  ['Custo', example.breakdown.costCents],
                  [`Impostos (DAS ${pct(inputs.dasBps)}%${inputs.taxBps !== inputs.dasBps ? ' + outros' : ''})`, example.breakdown.taxCents],
                  ['Comissão', example.breakdown.commissionCents],
                  ['Taxa de pagamento', example.breakdown.paymentFeeCents],
                  ['Despesas fixas', example.breakdown.fixedExpenseCents],
                  ['Lucro', example.breakdown.profitCents],
                ].map(([label, v]) => (
                  <div key={label as string} className="flex justify-between"><dt className="text-le-muted">{label}</dt><dd className="tabular-nums">{formatCurrency(v as number)}</dd></div>
                ))}
                <div className="flex justify-between border-t border-le-line pt-2 font-semibold"><dt>Preço de venda</dt><dd className="tabular-nums">{formatCurrency(example.priceCents)}</dd></div>
                <p className="text-xs text-le-muted">Mark-up: custo × {example.markup.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}</p>
              </dl>
            ) : <p className="mt-2 text-sm text-red-600">{example.reason}</p>}
          </div>

          <div className="rounded-2xl border border-le-line bg-white p-5 text-sm">
            <h2 className="font-heading text-base font-medium">Faixas do Anexo II (2026)</h2>
            <table className="mt-2 w-full text-xs">
              <thead className="text-left text-le-muted"><tr><th className="py-1 font-medium">Faturamento 12 meses até</th><th className="py-1 text-right font-medium">Nominal</th><th className="py-1 text-right font-medium">Deduzir</th></tr></thead>
              <tbody>{SIMPLES_ANEXO_II.map((b) => <tr key={b.upTo}><td className="py-0.5">{formatCurrency(b.upTo)}</td><td className="py-0.5 text-right">{pct(b.nominalBps)}%</td><td className="py-0.5 text-right">{formatCurrency(b.deductCents)}</td></tr>)}</tbody>
            </table>
            <p className="mt-2 text-[11px] text-le-muted">LC 123/2006 (LC 155/2016). A reforma tributária muda o Simples a partir de 2027: revise com o contador.</p>
          </div>

          <div className="rounded-2xl border border-le-line bg-white p-5 text-sm">
            <h2 className="font-heading text-base font-medium">NCM e alíquotas: onde consultar</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-xs text-le-muted">
              <li><strong className="text-le-text">NCM dos materiais</strong>: já vem na NF-e do fornecedor. Importe o XML em <em>Notas de compra</em> e o NCM é preenchido no material.</li>
              <li><strong className="text-le-text">NCM do que vocês fabricam</strong> (haste, tool joint, máquina) é outro, definido pela função do produto. Consulte a <a className="text-le-blue underline" href="https://portalunico.siscomex.gov.br/classif/" target="_blank" rel="noopener noreferrer">classificação no Portal Único Siscomex</a> e valide com o contador.</li>
              <li><strong className="text-le-text">IPI por NCM</strong>: <a className="text-le-blue underline" href="https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/legislacao/documentos-e-arquivos/tipi.pdf" target="_blank" rel="noopener noreferrer">Tabela TIPI (Receita Federal)</a>. No Simples o IPI já está no DAS.</li>
              <li><strong className="text-le-text">Carga aproximada por NCM</strong> (a que vai na nota ao consumidor, Lei 12.741): tabela do <a className="text-le-blue underline" href="https://deolhonoimposto.ibpt.org.br/" target="_blank" rel="noopener noreferrer">IBPT — De Olho no Imposto</a>.</li>
              <li><strong className="text-le-text">ICMS</strong> no Simples está no DAS; em vendas para outros estados pode haver DIFAL/ST. Peça ao contador a matriz por NCM × estado de destino.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
