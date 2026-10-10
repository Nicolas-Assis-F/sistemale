/** Regras puras do CRM do WhatsApp (sem banco): rótulos, links e status de resposta. */

export const SEGMENTS = {
  haste_2_3_8: { label: 'Haste 2 3/8″', template: 'Fala, {nome}! Aqui é o Nicolas, da L&E Torneadora (Aparecida de Goiânia). Estamos com haste 2 3/8″ de fábrica: 2 m R$ 650, 3 m R$ 780, 4 m R$ 850. Tubo SCH 80 e rosca usinada em CNC. Quantas você precisa?' },
  haste_2_7_8: { label: 'Haste 2 7/8″', template: 'Fala, {nome}! Aqui é o Nicolas, da L&E Torneadora. Haste 2 7/8″ com rosca API 2 3/8″ Regular: 2 m R$ 800, 3 m R$ 900, 4 m R$ 1.200. Tubo SCH 80 sem costura, cada haste inspecionada. Quer que eu separe um lote pra você?' },
  haste_3_1_2: { label: 'Haste 3 1/2″', template: 'Fala, {nome}! Aqui é o Nicolas, da L&E Torneadora. Haste 3 1/2″ com rosca API 2 3/8″ IF: 2 m R$ 900, 3 m R$ 1.200, 4 m R$ 1.500. Fabricação própria, rosca CNC temperada. Quantas e de qual comprimento?' },
  haste_4_1_2: { label: 'Haste 4 1/2″', template: 'Fala, {nome}! Aqui é o Nicolas, da L&E Torneadora. Fazemos haste 4 1/2″ sob encomenda, no comprimento que você usa. Me passa a rosca e a quantidade que eu te mando o preço.' },
  rosca: { label: 'Par de rosca', template: 'Fala, {nome}! Aqui é o Nicolas, da L&E Torneadora. Par de rosca (macho + fêmea), aço 1045 temperado e usinado em CNC: 2 3/8″ R$ 250, API Regular (haste 2 7/8″) R$ 400, API IF (haste 3 1/2″) R$ 500. Precisa de quantos pares?' },
  ponteira_adaptador: { label: 'Ponteira / adaptador', template: 'Fala, {nome}! Aqui é o Nicolas, da L&E Torneadora. Fazemos ponteiras, adaptadores e reduções para qualquer rosca. Me manda a foto da peça e a medida que eu te passo o preço.' },
  cabecote: { label: 'Cabeçote', template: 'Fala, {nome}! Aqui é o Nicolas, da L&E Torneadora. Cabeçote hidráulico com motor, agulha e cabeça d\'água: 80 m R$ 10.500, 120 m R$ 13.000, 250 m R$ 17.000. Qual profundidade você trabalha?' },
  maquina: { label: 'Máquina perfuratriz', template: 'Fala, {nome}! Aqui é o Nicolas, da L&E Torneadora. Montamos perfuratriz: AR60 R$ 75.000 e P80 R$ 58.000, além de máquina sob medida. Quer que eu te mande o vídeo dela trabalhando?' },
  broca_martelo: { label: 'Broca / martelo / bit', template: 'Fala, {nome}! Aqui é o Nicolas, da L&E Torneadora. Chegou importação de brocas PDC (127, 139 e 152 mm), martelo e bit CIR110. Qual diâmetro você está furando?' },
  hidraulica_pistao: { label: 'Pistão / hidráulica', template: 'Fala, {nome}! Aqui é o Nicolas, da L&E Torneadora. Fazemos pistão hidráulico sob encomenda. Me passa a medida, a força e onde ele vai trabalhar que eu te faço o orçamento.' },
  pescador: { label: 'Pescador', template: 'Fala, {nome}! Aqui é o Nicolas, da L&E Torneadora. Fazemos pescador para haste 2 3/8″, 2 7/8″ e 3 1/2″. Qual bitola você usa?' },
  compressor: { label: 'Compressor / DTH', template: 'Fala, {nome}! Aqui é o Nicolas, da L&E Torneadora. Trabalha com martelo/compressor? Temos martelo e bit CIR110 e fazemos as hastes para DTH. Me fala o que você está precisando.' },
  outros: { label: 'Geral', template: 'Fala, {nome}! Aqui é o Nicolas, da L&E Torneadora (Aparecida de Goiânia). Fabricamos hastes, roscas, cabeçotes e perfuratrizes para poço. Qual máquina você usa hoje? Assim te passo a peça certa e o preço.' },
} as const;

export type SegmentCode = keyof typeof SEGMENTS;
export const SEGMENT_CODES = Object.keys(SEGMENTS) as SegmentCode[];
export const segmentLabel = (code: string) => (SEGMENTS as Record<string, { label: string }>)[code]?.label ?? code;

export const KIND_LABELS: Record<string, string> = {
  cliente: 'Cliente', poceiro: 'Poceiro', dono_maquina: 'Dono de máquina', revenda: 'Revenda',
  fornecedor: 'Fornecedor', transportadora: 'Transportadora', concorrente: 'Concorrente',
  parceiro: 'Parceiro', interno: 'Interno', outro: 'Outro',
};
/** Tipos que não entram em campanha de venda. */
export const NOT_PROSPECT_KINDS = ['fornecedor', 'transportadora', 'interno', 'concorrente', 'parceiro'];

export const STAGE_LABELS: Record<string, string> = {
  sem_resposta: 'Sem resposta', conversando: 'Conversando', pediu_preco: 'Pediu preço',
  orcamento_enviado: 'Orçamento enviado', negociando: 'Negociando', fechou: 'Fechou',
  pos_venda: 'Pós-venda', perdido: 'Perdido',
};

export const TEMPERATURE_LABELS = { QUENTE: 'Quente', MORNO: 'Morno', FRIO: 'Frio' } as const;
export type Temperature = keyof typeof TEMPERATURE_LABELS;

/** Primeiro nome para a saudação; descarta palavras de produto que o Nicolas usa no nome salvo. */
const NOT_A_NAME = /^(haste|hastes|rosca|cabe[cç]ote|maquina|máquina|po[cç]o|po[cç]os|perfura\w*|compra|broca|sr|seu|cliente|\d.*)$/i;
export function firstName(name: string): string {
  const word = name.replace(/[^\p{L}\s'-]/gu, ' ').split(/\s+/).find((w) => w.length > 1 && !NOT_A_NAME.test(w));
  if (!word) return 'tudo bem';
  return word[0].toUpperCase() + word.slice(1).toLowerCase();
}

export function renderTemplate(template: string, name: string): string {
  return template.replaceAll('{nome}', firstName(name));
}

/** Telefone só com dígitos e DDI 55 quando vier sem. */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

export function formatPhone(phone: string): string {
  const m = phone.match(/^55(\d{2})(\d{4,5})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : `+${phone}`;
}

/** Link click-to-chat: abre o WhatsApp com o texto pronto; quem envia é a pessoa. */
export function whatsappLink(phone: string, text?: string): string {
  return `https://wa.me/${phone}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

/** O contato falou por último e ainda não teve resposta. */
export function awaitingReply(lead: { lastInboundAt: Date | null; lastOutboundAt: Date | null }): boolean {
  if (!lead.lastInboundAt) return false;
  return !lead.lastOutboundAt || lead.lastInboundAt > lead.lastOutboundAt;
}

export type DispatchState = 'PENDENTE' | 'ENVIADO' | 'RESPONDEU' | 'PULADO';

/**
 * Atualiza o status de um disparo com a atividade vista no WhatsApp.
 * Enviado = saiu mensagem nossa depois de criar o disparo; respondeu = o contato
 * escreveu depois do envio. Nunca volta um status para trás.
 */
export function nextDispatchState(
  d: { status: DispatchState; createdAt: Date; sentAt: Date | null },
  activity: { lastOutboundAt: Date | null; lastInboundAt: Date | null },
): { status: DispatchState; sentAt: Date | null; repliedAt: Date | null } | null {
  if (d.status === 'PULADO' || d.status === 'RESPONDEU') return null;
  let sentAt = d.sentAt;
  if (!sentAt && activity.lastOutboundAt && activity.lastOutboundAt >= d.createdAt) sentAt = activity.lastOutboundAt;
  if (!sentAt) return null;
  if (activity.lastInboundAt && activity.lastInboundAt > sentAt) return { status: 'RESPONDEU', sentAt, repliedAt: activity.lastInboundAt };
  if (d.status === 'PENDENTE') return { status: 'ENVIADO', sentAt, repliedAt: null };
  return null;
}
