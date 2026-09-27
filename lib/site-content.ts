// Conteúdo institucional editável (modelo SiteContent, key/JSON).
// As páginas públicas leem do banco e caem nestes defaults quando vazio.
// O admin (app/admin/conteudo) edita estes mesmos campos.

export const NAV_LINKS = [
  { href: '/sobre', label: 'A Empresa' },
  { href: '/servicos', label: 'Serviços' },
  { href: '/vitrine', label: 'Catálogo' },
  { href: '/galeria', label: 'Galeria' },
  { href: '/contato', label: 'Contato' },
] as const;

// ─── Tipos de conteúdo por seção ────────────────────────────────────────────────

export interface HomeContent {
  heroEyebrow: string;
  heroTitle: string;
  heroHighlight: string;
  heroSubtitle: string;
  heroImage?: string; // URL opcional; sem imagem cai no gradiente + grid
  ctaTitle: string;
  ctaSubtitle: string;
  trust: { icon?: string; title: string }[]; // chips de destaque no hero
  stats: { label: string; value: string }[]; // faixa de números
  testimonials: { quote: string; name: string; role?: string }[]; // depoimentos
  guarantees: { icon?: string; title: string; description: string }[]; // certificações/garantia
}

export interface SobreContent {
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  story: string; // markdown
  stats: { label: string; value: string }[];
  values: { title: string; description: string }[];
}

export interface ServicosContent {
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  steps: { title: string; description: string }[];
}

export interface ContatoContent {
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  hours: string;
}

// ─── Defaults (usados como fallback e como seed inicial) ──────────────────────────

export const DEFAULT_HOME: HomeContent = {
  heroEyebrow: 'Fundada em 2021 · Aparecida de Goiânia – GO',
  heroTitle: 'LE Torneadora',
  heroHighlight: 'Equipamentos para Poços Artesianos',
  heroSubtitle:
    'Fabricamos todos os equipamentos para poços artesianos — máquinas de 40m a 100m, cabeçote hidráulico, roscas e hastes de perfuração. Pronta entrega e suporte técnico especializado.',
  ctaTitle: 'Precisa de ajuda para escolher?',
  ctaSubtitle:
    'Nossa equipe técnica está pronta para indicar a peça certa para o seu poço artesiano.',
  trust: [
    { icon: 'Zap', title: 'Pronta entrega' },
    { icon: 'Factory', title: 'Fabricação própria' },
    { icon: 'Headphones', title: 'Suporte técnico' },
  ],
  stats: [
    { value: '2021', label: 'Desde' },
    { value: '40–100m', label: 'Profundidade' },
    { value: 'Própria', label: 'Fabricação' },
    { value: 'Brasil', label: 'Atendimento' },
  ],
  testimonials: [], // vazio por padrão — a seção só aparece após cadastrar no admin
  guarantees: [
    { icon: 'Factory', title: 'Fabricação própria', description: 'Tornearia e usinagem internas, com controle de qualidade em cada peça.' },
    { icon: 'ShieldCheck', title: 'Garantia de fábrica', description: 'Equipamentos garantidos contra defeitos de fabricação.' },
    { icon: 'Truck', title: 'Entrega para todo o Brasil', description: 'Pronta entrega e embalagem segura para qualquer estado.' },
    { icon: 'Headphones', title: 'Suporte técnico', description: 'Acompanhamento de quem conhece o equipamento de ponta a ponta.' },
  ],
};

export const DEFAULT_SOBRE: SobreContent = {
  heroEyebrow: 'A Empresa',
  heroTitle: 'Tecnologia e robustez para perfuração de poços',
  heroSubtitle:
    'Desde 2021, projetamos e fabricamos equipamentos completos para perfuração de poços artesianos, atendendo perfuradores em todo o Brasil.',
  story: `A **LE Torneadora** nasceu da experiência prática em usinagem e perfuração. Fabricamos, com tornearia própria, máquinas de perfuração de **40 a 100 metros**, cabeçotes hidráulicos, roscas e hastes — peças que exigem precisão e resistência para operar em campo.

Cada equipamento é produzido para durar: aço selecionado, tolerâncias rígidas e acabamento que o perfurador reconhece na primeira obra. Atendemos desde a peça de reposição até a máquina completa, com suporte técnico que entende a rotina de quem perfura.`,
  stats: [
    { label: 'Desde', value: '2021' },
    { label: 'Profundidade', value: '40–100m' },
    { label: 'Fabricação', value: 'Própria' },
    { label: 'Atendimento', value: 'Brasil' },
  ],
  values: [
    { title: 'Fabricação própria', description: 'Tornearia e usinagem internas garantem precisão e prazo.' },
    { title: 'Robustez de campo', description: 'Equipamentos projetados para a realidade da perfuração.' },
    { title: 'Suporte técnico', description: 'Orientação de quem conhece o equipamento de ponta a ponta.' },
  ],
};

export const DEFAULT_SERVICOS: ServicosContent = {
  heroEyebrow: 'Serviços',
  heroTitle: 'Soluções completas para perfuração',
  heroSubtitle:
    'Da peça de reposição à máquina completa de perfuração, fabricamos e damos suporte a todo o equipamento do seu poço.',
  steps: [
    { title: 'Diagnóstico', description: 'Entendemos sua operação e indicamos o equipamento certo.' },
    { title: 'Fabricação', description: 'Produzimos com tornearia própria e controle de qualidade.' },
    { title: 'Entrega', description: 'Pronta entrega para todo o Brasil, com embalagem segura.' },
    { title: 'Suporte', description: 'Acompanhamento técnico e reposição de peças quando precisar.' },
  ],
};

export const DEFAULT_CONTATO: ContatoContent = {
  heroEyebrow: 'Contato',
  heroTitle: 'Fale com a nossa equipe',
  heroSubtitle:
    'Tire dúvidas, peça um orçamento ou solicite suporte técnico. Respondemos rápido pelo WhatsApp.',
  hours: 'Seg–Sex, 8h às 18h',
};

// Serviços de exemplo (seed do modelo ServiceItem)
export const DEFAULT_SERVICE_ITEMS = [
  { title: 'Máquinas de Perfuração 40–100m', description: 'Fabricação de máquinas completas para perfuração de poços artesianos de 40 a 100 metros.', icon: 'Drill', order: 1 },
  { title: 'Cabeçote Hidráulico', description: 'Cabeçotes hidráulicos robustos, dimensionados para alta pressão de trabalho.', icon: 'Gauge', order: 2 },
  { title: 'Roscas e Hastes', description: 'Roscas e hastes de perfuração usinadas com precisão para encaixe perfeito.', icon: 'Wrench', order: 3 },
  { title: 'Peças de Reposição', description: 'Reposição de componentes e peças usinadas sob medida para o seu equipamento.', icon: 'Settings', order: 4 },
  { title: 'Manutenção e Suporte', description: 'Suporte técnico especializado e manutenção de equipamentos de perfuração.', icon: 'Headphones', order: 5 },
  { title: 'Pronta Entrega', description: 'Estoque disponível e envio imediato para todo o território nacional.', icon: 'Truck', order: 6 },
] as const;
