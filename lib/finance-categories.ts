// Plano de contas simplificado — seguro para client components.
import type { FinanceStatus, FinanceType, PayType } from '@prisma/client';

export interface FinanceCategory {
  key: string;
  label: string;
  type: FinanceType;
  /** Agrupamento para o resultado do mês (DRE simplificado). */
  group: 'VENDAS' | 'OUTRAS_RECEITAS' | 'PESSOAL' | 'PRODUCAO' | 'OPERACAO' | 'IMPOSTOS' | 'FINANCEIRO';
}

export const FINANCE_CATEGORIES: FinanceCategory[] = [
  // Receitas (vendas de pedidos entram automaticamente pelos pagamentos)
  { key: 'VENDA_AVULSA', label: 'Venda avulsa (fora do sistema)', type: 'RECEITA', group: 'VENDAS' },
  { key: 'SERVICOS', label: 'Serviços de usinagem / manutenção', type: 'RECEITA', group: 'VENDAS' },
  { key: 'OUTRAS_RECEITAS', label: 'Outras receitas', type: 'RECEITA', group: 'OUTRAS_RECEITAS' },
  { key: 'APORTE', label: 'Aporte / empréstimo recebido', type: 'RECEITA', group: 'FINANCEIRO' },
  // Pessoal
  { key: 'SALARIOS', label: 'Salários', type: 'DESPESA', group: 'PESSOAL' },
  { key: 'COMISSOES', label: 'Comissões', type: 'DESPESA', group: 'PESSOAL' },
  { key: 'ADIANTAMENTO', label: 'Adiantamento / vale', type: 'DESPESA', group: 'PESSOAL' },
  { key: 'ENCARGOS', label: 'Encargos (FGTS, INSS, férias, 13º)', type: 'DESPESA', group: 'PESSOAL' },
  { key: 'PRO_LABORE', label: 'Pró-labore / retirada dos sócios', type: 'DESPESA', group: 'PESSOAL' },
  // Produção
  { key: 'MATERIA_PRIMA', label: 'Matéria-prima (aço, tubos, barras)', type: 'DESPESA', group: 'PRODUCAO' },
  { key: 'COMPONENTES', label: 'Componentes (motores, hidráulica, rolamentos)', type: 'DESPESA', group: 'PRODUCAO' },
  { key: 'FERRAMENTAS', label: 'Ferramentas e insumos (pastilhas, brocas, solda)', type: 'DESPESA', group: 'PRODUCAO' },
  { key: 'TERCEIRIZACAO', label: 'Serviços terceirizados (tratamento, pintura)', type: 'DESPESA', group: 'PRODUCAO' },
  { key: 'FRETE', label: 'Frete e entrega', type: 'DESPESA', group: 'PRODUCAO' },
  // Operação
  { key: 'ALUGUEL', label: 'Aluguel', type: 'DESPESA', group: 'OPERACAO' },
  { key: 'ENERGIA', label: 'Energia elétrica', type: 'DESPESA', group: 'OPERACAO' },
  { key: 'AGUA_INTERNET', label: 'Água, telefone e internet', type: 'DESPESA', group: 'OPERACAO' },
  { key: 'MANUTENCAO', label: 'Manutenção de máquinas', type: 'DESPESA', group: 'OPERACAO' },
  { key: 'COMBUSTIVEL', label: 'Combustível e veículos', type: 'DESPESA', group: 'OPERACAO' },
  { key: 'MARKETING', label: 'Marketing e site', type: 'DESPESA', group: 'OPERACAO' },
  { key: 'CONTABILIDADE', label: 'Contabilidade e sistemas', type: 'DESPESA', group: 'OPERACAO' },
  { key: 'OUTRAS_DESPESAS', label: 'Outras despesas', type: 'DESPESA', group: 'OPERACAO' },
  // Impostos e financeiro
  { key: 'IMPOSTOS', label: 'Impostos (DAS, ICMS, ISS)', type: 'DESPESA', group: 'IMPOSTOS' },
  { key: 'TAXAS', label: 'Taxas bancárias e de cobrança', type: 'DESPESA', group: 'FINANCEIRO' },
  { key: 'EMPRESTIMO', label: 'Parcela de empréstimo / financiamento', type: 'DESPESA', group: 'FINANCEIRO' },
  { key: 'INVESTIMENTO', label: 'Investimento (máquinas, equipamentos)', type: 'DESPESA', group: 'FINANCEIRO' },
];

export const CATEGORY_BY_KEY = Object.fromEntries(FINANCE_CATEGORIES.map((c) => [c.key, c]));
export const categoryLabel = (key: string) => CATEGORY_BY_KEY[key]?.label ?? key;

export const GROUP_LABELS: Record<FinanceCategory['group'], string> = {
  VENDAS: 'Vendas',
  OUTRAS_RECEITAS: 'Outras receitas',
  PESSOAL: 'Pessoal',
  PRODUCAO: 'Custos de produção',
  OPERACAO: 'Despesas operacionais',
  IMPOSTOS: 'Impostos',
  FINANCEIRO: 'Financeiro',
};

export const FINANCE_STATUS_LABELS: Record<FinanceStatus, string> = { PREVISTO: 'Em aberto', PAGO: 'Pago', CANCELADO: 'Cancelado' };

export const ACCOUNTS = ['Banco', 'Caixa (dinheiro)', 'Asaas', 'Cartão da empresa'];
export const METHODS = ['PIX', 'Boleto', 'Transferência', 'Dinheiro', 'Cartão', 'Débito automático'];

export const PAY_TYPE_LABELS: Record<PayType, string> = {
  SALARIO: 'Salário fixo',
  COMISSAO: 'Somente comissão',
  SALARIO_COMISSAO: 'Salário + comissão',
};

export const earnsCommission = (t: PayType) => t !== 'SALARIO';
export const earnsSalary = (t: PayType) => t !== 'COMISSAO';

/** "2026-09" → "setembro de 2026" */
export function competenceLabel(c: string) {
  const [y, m] = c.split('-').map(Number);
  const label = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1); // "Setembro de 2026"
}

export function shiftCompetence(c: string, delta: number) {
  const [y, m] = c.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Competência atual no fuso de Brasília. */
export function currentCompetence() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).format(new Date()).slice(0, 7);
}
