# Prompt para o Codex — Rodada de UI/UX (L&E Torneadora)

> Cole tudo abaixo da linha no Codex, com o repositório `letorneadora` aberto.

---

Você é um(a) engenheiro(a) de front-end sênior e designer de produto trabalhando no repositório **letorneadora**: site institucional, catálogo e painel administrativo da **L&E Torneadora**, fabricante de máquinas e componentes para perfuração de poços artesianos (Aparecida de Goiânia – GO). O público são perfuradores e engenheiros que decidem por especificação técnica e fecham negócio pelo WhatsApp. O painel é usado por uma equipe pequena: velocidade e poucos cliques valem mais que enfeite.

Sua missão é uma **rodada de consolidação de UI/UX**: deixar o sistema inteiro coeso, acessível e rápido, levando as telas antigas ao padrão das telas novas. **Não** crie funcionalidades de negócio novas nem altere regras financeiras.

## 1. Stack e armadilhas (leia antes de codar)

- **Next.js 16.2 (App Router, Turbopack)**. Antes de usar qualquer API do Next, leia o guia em `node_modules/next/dist/docs/`. Nesta versão:
  - o middleware se chama `proxy.ts` e exporta `proxy()`;
  - `params` e `searchParams` são `Promise`;
  - `revalidateTag(tag, 'max')` exige 2 argumentos.
- **Nunca rode `npm run dev` / `next dev`**: trava a máquina do dono do projeto. Valide com `npm run build` (precisa sair com código 0) e, se quiser ver a tela, com `npm run build && npx next start -p 3100`.
- **Tailwind v4** sem arquivo de config: tokens e utilitários ficam em `app/globals.css`.
  - Use as formas canônicas: `bg-linear-to-r` (não `bg-gradient-*`), `supports-backdrop-filter:`, escala numérica (`w-125`) em vez de `w-[500px]` quando existir.
  - **Todo CSS novo vai dentro de `@layer base` ou `@layer components`.** CSS fora de layer vence qualquer utilitário, e isso já quebrou o campo de senha do login.
  - As classes `le-*` antigas ainda estão soltas no fim de `globals.css`. Quando precisar sobrepô-las, use o sufixo `!` (ex.: `gap-2!`) ou migre a classe para `@layer components`.
- **shadcn v4 sobre `@base-ui/react`**:
  - não existe `asChild`; para link com cara de botão, use `<Link className={buttonVariants(...)}>`;
  - o `Select` precisa da prop `items={[{ value, label }]}` no Root, senão mostra o id cru;
  - drawers e modais usam `Dialog` do base-ui (`components/ui/sheet.tsx` e `components/ui/dialog.tsx`).
- **Zod v4 + React Hook Form**: não use `z.coerce` nem `.default()` em schemas de **formulário** (quebra o tipo do resolver). Use `z.number()` + `defaultValues` + `valueAsNumber`.
- **Prisma 5** (não atualize para 6/7). O projeto não tem migrations: o schema é aplicado com `npx prisma db push`.
- **Motion** (`motion/react`) com `LazyMotion strict`: use sempre `m.div`, nunca `motion.div`.
- **Server Actions são endpoints públicos.** Toda action nova ou alterada começa com `await requireAdmin()` (de `@/lib/auth`). Nunca exporte helpers internos de um arquivo `'use server'`.
- Não importe constantes de um módulo `"use client"` dentro de Server Component: isso devolve uma *client reference*. Coloque constantes compartilhadas em `lib/`.
- `mix-blend-multiply` (usado nas fotos de fundo branco em `/public/catalogo`) vai no elemento que tem `transform`, não no `<img>` dentro dele.

## 2. Contratos que NÃO podem mudar

1. **Mensagem do WhatsApp**: `lib/whatsapp-url.ts` gera `[SKU] Olá! Tenho interesse…`. Um bot lê o `[SKU]` no início da mensagem. Não altere esse formato.
2. **Módulo financeiro**: em `lib/orders/ledger.ts`, `lib/orders/asaas-sync.ts`, `lib/asaas.ts`, `app/api/webhooks/asaas/route.ts` e nas actions de `app/admin/pedidos/_payment-actions.ts` e `app/admin/comissoes/_actions.ts`, você **não altera regra de negócio**. Pode mexer só na apresentação dos componentes em `components/admin/orders/*` e `components/admin/commissions/*`.
3. **URLs públicas**: `/vitrine`, `/vitrine/[slug]`, `/vitrine/[slug]/ficha-tecnica` (PDF), `/vitrine/comparar?itens=`, `/pedido/[token]`. A URL da vitrine guarda o estado dos filtros (`?categoria=&q=&ordem=&visual=&e.<spec>=`).
4. **Página `/pedido/[token]`** (pública): não pode exibir CPF/CNPJ, endereço nem observações internas.
5. **Não adicione dependências** sem justificar no resumo final. Prefira CSS e o que já está instalado (motion, lucide-react, base-ui, react-hook-form, zod).

## 3. Identidade visual atual (a referência)

- **Cores**:
  - azul da marca `#3158ef` (primary);
  - tinta `#0b0a3b` (fundos escuros, texto forte);
  - amarelo `#f7cd47` (acento; no código se chama `orange` / `--brand-orange`);
  - WhatsApp `#1faa59`;
  - fundo `#f8f9fc`, bordas `#e3e5ef` e `#eceef5`.
- **Tipografia**: `--font-display` nos títulos (tracking negativo, `font-medium`), `--font-sans` no corpo, `font-mono` em SKU e números de pedido.
- **Telas que já estão no padrão novo — use como referência**:
  - `components/catalog/*` (MotionProductCard com hover em CSS `.le-mcard*`, CatalogExplorer, ProductQuickView, CompareView, CompareTray);
  - `app/admin/produtos/page.tsx` + `components/admin/ProductSheet.tsx`, `ProductFilters.tsx`, `ProductFlagToggle.tsx`;
  - `components/admin/CommandPalette.tsx` (⌘K) e `components/admin/toast.tsx`;
  - `app/admin/login/page.tsx` + `components/admin/PasswordField.tsx`;
  - `app/admin/pedidos/[id]/page.tsx` (centro de controle do pedido) e `app/admin/comissoes/page.tsx`.
- **Padrão do painel**:
  - cards `rounded-2xl border border-[#e5e7f1] bg-white`;
  - cabeçalho de página com `le-kicker` + título `font-heading text-3xl tracking-[-.05em]`;
  - status em pílulas `rounded-full`;
  - ações rápidas inline e slide-over (`Sheet`) em vez de navegar para outra página;
  - feedback com `toast()`.

## 4. Tarefas (em ordem de prioridade)

### P0 — Sistema de design coeso
1. **Tokens em vez de hex fixo**: há ~876 cores hexadecimais espalhadas em `app/` e `components/`.
   - Crie tokens semânticos em `globals.css` (`--le-ink`, `--le-blue`, `--le-yellow`, `--le-text`, `--le-text-muted`, `--le-line`, `--le-surface`, `--le-whatsapp`…) expostos via `@theme inline`, gerando utilitários como `text-le-muted` e `border-le-line`.
   - Migre os arquivos com mais ocorrências. Não precisa zerar, mas os componentes de catálogo, admin e pedidos devem usar tokens.
2. **Migrar o bloco `.le-*` solto** do fim de `globals.css` para `@layer components` e remover os `!` que deixarem de ser necessários.
3. **Contraste AA (WCAG 2.2)**:
   - vários cinzas (`#9a9cb1`, `#a0a2b7`, `#a8aabd`) em textos de 10–11px ficam abaixo de 4.5:1 sobre branco;
   - defina um `--le-text-muted` que passe AA e aplique;
   - nenhum texto funcional abaixo de 11px.
4. **Unificar botões**: hoje convivem `le-button*`, `buttonVariants` e botões ad-hoc. Consolide as variantes em `components/ui/button.tsx`:
   - `primary`, `dark`, `outline`, `ghost`, `whatsapp`, `danger`;
   - tamanhos `sm`, `md`, `lg`;
   - estados de foco, `disabled` e `loading` (spinner + `aria-busy`).
   Troque os usos principais.

### P1 — Painel admin no padrão novo (19 páginas antigas)
Páginas ainda com `space-y-6 p-6` / `rounded-lg border`: `clientes/*`, `funcionarios/*`, `servicos/*`, `galeria/*`, `mensagens/*`, `conteudo/*`, `pedidos/page.tsx`, `pedidos/novo`, `pedidos/[id]/editar`.

1. **Listagens**:
   - cabeçalho padrão, filtros instantâneos com debounce e "/" para buscar (reaproveite `ProductFilters`);
   - estados vazios úteis com CTA;
   - criar/editar em **slide-over** (`?novo=1` / `?editar=<id>`, igual a produtos) onde o formulário for curto: clientes, funcionários, serviços, categorias, galeria.
2. **Pedidos (lista)**:
   - busca por número ou cliente;
   - filtro por status **e** por situação financeira (`paymentStatus`);
   - coluna "a receber";
   - alternância opcional **lista ↔ quadro kanban por status** (mudar status arrastando pode chamar a action existente `updateOrderStatus`; sem nova regra).
3. **Formulário de pedido** (`components/admin/OrderForm.tsx`, 594 linhas):
   - quebre em seções/etapas: Cliente → Itens → Condições → Revisão;
   - resumo fixo com total;
   - atalho ⌘↵ para salvar;
   - validação inline;
   - mantenha o contrato de `createOrder` / `updateOrder` (FormData + `items` em JSON).
4. **Dashboard** (`app/admin/page.tsx`):
   - faixa de KPIs financeiros: a receber, recebido no mês, cobranças vencidas, comissões a pagar (dados de `Order.paidCents`, `Order.totalCents`, `Payment`, `Commission`);
   - lista "precisa de atenção" (cobranças vencidas, pedidos sem CPF/CNPJ com cobrança pendente, comissões liberadas);
   - gráficos só em SVG/CSS.
5. **Carregamento**: crie `loading.tsx` com skeletons no layout do admin e nas rotas pesadas (pedidos, comissões, produtos). Hoje o admin não tem nenhum.
6. **Mobile do admin**: tabelas viram cards abaixo de `md`; ações principais ao alcance do polegar.

### P2 — Site público
1. **Coerência entre páginas**: `categoria/[slug]` e `busca` ainda usam o visual antigo. Unifique com a vitrine: `MotionProductCard` e redirecionamento ou filtro para `/vitrine?categoria=`, mantendo SEO (canonical).
2. **Página do pedido** (`/pedido/[token]`):
   - refino visual (hierarquia, destaque do "Pagar agora", estado "Pago ✓" celebrativo mas sóbrio);
   - impressão amigável (`@media print`).
3. **Header e navegação mobile**: foco visível, `aria-current`, menu com trap de foco (já é Dialog; verifique).
4. **Performance**:
   - `sizes` corretos em todas as `<Image>`;
   - `priority`/`preload` só no LCP;
   - nada de `framer`/`motion` em conteúdo estático;
   - alvo Lighthouse mobile ≥ 90 em Performance e ≥ 95 em Acessibilidade na home, em `/vitrine` e em `/vitrine/ar-100`.
5. **Microinterações**: respeite `prefers-reduced-motion` (já há regra global). Animações apenas com `transform`/`opacity`, 150–400ms, *ease-out* `cubic-bezier(.22,1,.36,1)`.

### P3 — Limpeza
- `components/public/ProductCard.tsx` não é mais usado. Remova, junto com outros componentes órfãos que você comprovar (grep antes).
- Padronize textos da interface em pt-BR (acentuação, "Salvar alterações" com a mesma capitalização em todo o painel).

## 5. Critérios de aceite

- `npm run build` sai com código 0, sem warnings novos, e `npx tsc --noEmit` passa.
- Nenhum `next dev` executado.
- Telas verificadas em 375px, 768px e 1440px, sem scroll horizontal.
- Navegação completa por teclado nas telas alteradas (Tab, Esc fecha modal/slide-over, foco visível).
- Contraste AA nos textos alterados.
- Nenhuma mudança em regra de negócio, schema Prisma, URLs públicas ou formato da mensagem do WhatsApp.
- Commits pequenos por tema (ex.: `feat(ui): tokens semânticos`, `refactor(admin): clientes em slide-over`), sem `.env` nem segredos.

## 6. Entrega

Ao final, escreva um resumo com:
1. O que mudou, por prioridade.
2. Lista de arquivos principais alterados.
3. Antes/depois do contraste (cores antigas → tokens novos).
4. O que ficou de fora e por quê.
5. Qualquer dependência adicionada, com justificativa.
