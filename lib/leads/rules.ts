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
/** Etapas que ficam fora de campanha, a não ser que se marque o contrário. */
export const NEGOTIATING_STAGES = ['pediu_preco', 'orcamento_enviado', 'negociando'];

export const STAGE_LABELS: Record<string, string> = {
  sem_resposta: 'Sem resposta', conversando: 'Conversando', pediu_preco: 'Pediu preço',
  orcamento_enviado: 'Orçamento enviado', negociando: 'Negociando', fechou: 'Fechou',
  pos_venda: 'Pós-venda', perdido: 'Perdido',
};

export const TEMPERATURE_LABELS = { QUENTE: 'Quente', MORNO: 'Morno', FRIO: 'Frio' } as const;
export type Temperature = keyof typeof TEMPERATURE_LABELS;

/** Primeiro nome para a saudação; descarta palavras de produto que o Nicolas usa no nome salvo. */
const NOT_A_NAME = new RegExp('^(' + [
  'haste', 'hastes', 'rosca', 'roscas', 'cabe[cç]\\w*', 'u?m?a?m[aá]quina', 'm[aá]quinas', 'po[cç]os?', 'pocos?', 'perfura\\w*', 'artesian\\w*',
  'semi', 'tubo', 'pol', 'compra', 'vende', 'brocas?', 'pdc', 'mesa', 'torre', 'ponteira\\w*', 'adaptador\\w*', 'pe[cç]as?', 'martelo', 'bit',
  'compressor', 'pist[aã]o', 'pescador', 'torno', 'tornearia', 'usinagem', 'hidr[aá]ulic\\w*', 'el[eé]tric\\w*', 'elwtrici', 'mec[aâ]nic\\w*',
  'sondagem', 'estrutura', 'eixo', 'velocidades?', 'liga', 'bomba', 'frete', 'montar', 'fazer', 'esp', 'folgado', 'invejada',
  'face', 'facebook', 'insta', 'instagram', 'msg', 'mensage\\w*', 'perfil', 'indicado', 'nome', 'sem', 'solu[cç]\\w*', 'm[aã]e',
  'irm[aã]os', 'bombas', 'execu[cç]\\w*', 'drilling', 'tools', 'strong', 'hand', 'furg', 'weg', 'sondage\\w*', 'parana', 'vidalpo\\w*', 'hidrofendas',
  'mini', 'com', 'de', 'da', 'por', 'do', 'das', 'dos', 'em', 'para', 'pra', 'um', 'uma', 'sr', 'seu', 'dona', 'cliente',
].join('|').replaceAll('\\w', '\\p{L}') + ')$', 'iu');
export function firstName(name: string): string {
  const word = name.replace(/\(indicad[^)]*\)/gi, ' ').replace(/[^\p{L}\s]/gu, ' ').split(/\s+/).find((w) => w.length > 2 && w.length <= 12 && !NOT_A_NAME.test(w));
  if (!word) return 'tudo bem';
  return word[0].toUpperCase() + word.slice(1).toLowerCase();
}

/** Versões inteiras da mensagem: blocos separados por uma linha com "---". */
export function templateVersions(template: string): string[] {
  const versions = template.split(/^\s*---\s*$/m).map((v) => v.trim()).filter(Boolean);
  return versions.length ? versions : [template.trim()];
}

/**
 * Mensagem de cada contato. Sorteia uma das versões (separadas por "---") e, dentro dela,
 * um trecho de cada [opção a|opção b]; assim nenhum disparo sai com o texto idêntico.
 */
/** Nome da saudação: o salvo na agenda; se ele só tiver produto, o do perfil do WhatsApp. */
export function greetingName(lead: { name: string; pushName?: string | null }): string {
  const saved = firstName(lead.name);
  return saved === 'tudo bem' && lead.pushName ? lead.pushName : lead.name;
}

export function renderTemplate(template: string, name: string, random: () => number = Math.random): string {
  const pick = <T,>(xs: T[]) => xs[Math.min(Math.floor(random() * xs.length), xs.length - 1)];
  return pick(templateVersions(template))
    .replace(/\[([^[\]]*\|[^[\]]*)\]/g, (_, opts: string) => pick(opts.split('|')).trim())
    .replaceAll('{nome}', firstName(name));
}

/** Promoção de hastes em 5 versões, com trechos variáveis, para disparo automático. */
export const PROMO_HASTES_TEMPLATE = [
  '[Fala|Opa|E aí], {nome}! Aqui é o Nicolas, da L&E Torneadora, de Aparecida de Goiânia. Estamos com promoção nas hastes de fábrica: 2 3/8″, 2 7/8″ e 3 1/2″, de 2 a 4 m. Qual bitola você usa? [Te mando o preço agora.|Já te passo o valor.]',
  '[Fala|Opa], {nome}! Nicolas da L&E Torneadora [aqui|falando]. Tá precisando de haste? Estamos com promoção [essa semana|esse mês]. Me fala a bitola e a quantidade que eu [já te passo o valor|te mando a cotação].',
  '[Fala|Bom dia|Opa], {nome}! Nicolas da L&E Torneadora aqui. Liberamos uma promoção nas hastes e [lembrei de você|resolvi te avisar]. Ainda tá furando com qual bitola? Te faço uma cotação sem compromisso.',
  '[Fala|E aí], {nome}! Aqui é o Nicolas, da L&E Torneadora, de Aparecida de Goiânia. Fabricamos hastes, roscas, cabeçotes e perfuratrizes para poço, e [estamos com|entrou] promoção nas hastes. Me conta qual máquina e bitola você usa que eu monto uma cotação pra você.',
  '[Opa|Fala], {nome}! Nicolas da L&E Torneadora. Haste direto da fábrica com preço de promoção: tubo SCH 80 e rosca usinada em CNC, [2 3/8″, 2 7/8″ e 3 1/2″|de 2 3/8″ até 3 1/2″]. [Quer uma cotação?|Posso te mandar os valores?]',
].join('\n---\n');

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
