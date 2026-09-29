# Prompt para o Codex — Rodada 2 (L&E Torneadora)

> Cole tudo abaixo da linha no Codex, com o repositório `letorneadora` aberto. As tarefas são independentes: dá para pedir uma de cada vez (“faça só a Tarefa 2”).

---

Você é um(a) engenheiro(a) sênior trabalhando no repositório **letorneadora**: site, vitrine com compra online, portal do cliente e painel da **L&E Torneadora** (máquinas e componentes para perfuração de poços artesianos, Aparecida de Goiânia – GO). Clientes compram **pelo celular**; a equipe usa o painel no computador. Entregue código pronto para produção, pequeno e testado.

## 1. Regras do projeto (obrigatórias)

- **Next.js 16.3** (App Router). Antes de usar API do Next, leia `node_modules/next/dist/docs/`. `params`/`searchParams` são `Promise`; o middleware é `proxy.ts`; `revalidateTag(tag, 'max')`.
- **Nunca rode `npm run dev`** (trava a máquina). Valide com `npm run build` (exit 0) e `npm test`. Para ver telas: `npm run build && npx next start -p 3100`.
- **Banco:** Prisma 5 com **migrations versionadas** em `prisma/migrations`. Nesta rodada **não crie migrations** nem altere `prisma/schema.prisma`. Nunca rode `db push`, `migrate` ou scripts contra bancos remotos.
- **Segurança (há teste que quebra se violar — `lib/security.test.ts`):**
  - toda página em `app/admin/**/page.tsx` começa com `await requireAdmin();`;
  - toda Server Action exportada (`'use server'`) chama `requireAdmin()` ou `requireCustomer()` no início;
  - nada de segredo em `NEXT_PUBLIC_*`; não importe `lib/db`, `lib/asaas`, `lib/auth`, `lib/email` em componente client (são `server-only`);
  - não exiba mensagem de erro de provedor (Asaas, Blob) para cliente: mensagem genérica + `console.error`.
- **Não mexa** em: `lib/orders/*`, `lib/asaas.ts`, `lib/integrations/**`, `lib/infrastructure/**`, `app/api/webhooks/**`, `app/api/cron/**`, `lib/auth.ts`, `lib/admin-session.ts`, `lib/customer-auth.ts`, `proxy.ts`, `next.config.ts` (headers de segurança). Se uma tarefa parecer exigir, pare e explique.
- **Contratos:** a mensagem do WhatsApp (`lib/whatsapp-url.ts`) começa com `[SKU]` (um bot lê); `/pedido/[token]` nunca mostra CPF/CNPJ, endereço ou notas internas; preço sempre vem do banco, nunca do navegador.
- **UI:** Tailwind v4 (tokens em `app/globals.css`; CSS novo **dentro de `@layer components`**); shadcn v4 sobre base-ui (**sem `asChild`**: use `<Link className={buttonVariants()}>`); Motion com `m.div` (LazyMotion strict); ícones `lucide-react`. Textos em português do Brasil, tom direto.
- **Dinheiro em centavos (Int).** Para ler número digitado use `parseDecimal` de `lib/domains/costing/steel.ts` (aceita “9,50” e “9.50”); **não** use `parseCurrencyToCents` em campos novos (trata ponto como milhar).
- Não adicione dependências sem justificar no resumo.
- Testes: `node:test` + `tsx` (veja `lib/domains/costing/costing.test.ts`). Registre arquivos novos de teste no script `test` do `package.json`. Testes que usam banco leem `TEST_DATABASE_URL` e são pulados sem ela.

## 2. Tarefas

### Tarefa 1 — Cotação rápida por peso (admin)

Nova página `app/admin/custos/cotacao/page.tsx` + aba “Cotação rápida” em `components/admin/costing/CostingNav.tsx`.

- O vendedor escolhe um **material** (barra/tubo do cadastro), informa **comprimento (mm)**, **quantidade de peças** e **perda %**; opcionalmente adiciona linhas de **processo** (processo + minutos) e um **serviço** avulso (R$).
- Mostra: kg total, custo do aço, custo dos processos, **custo total**, **preço sugerido** (use `suggestPrice` + `priceInputs(defaultPricingProfile())` de `lib/domains/costing/service.ts`/`pricing.ts`) e **preço por kg** de venda.
- Tudo recalcula no navegador (componente client) com as funções puras de `lib/domains/costing` (`kgPerMeter`, `pieceKg`, `suggestPrice`). Nada é gravado.
- Botão “Copiar resumo” (texto para colar no WhatsApp: material, medidas, kg, preço).
- Aceite: build ok; teste unitário novo para a função que monta o resumo; a conta de 1 peça de barra 3 1/2" × 250 mm com 5% de perda dá ≈ 12,79 kg.

### Tarefa 2 — Preço nos cards da vitrine (mobile first)

Em `components/catalog/MotionProductCard.tsx` (e onde o card aparece: vitrine, home, relacionados):

- Exibir o preço com o mesmo componente/regra de `components/catalog/ProductPrice.tsx` (`getProductOffer` para “De ~~X~~ por Y” e % de desconto); produto com `priceCents = 0` mostra “Sob cotação”.
- Selo pequeno de estoque (“Em estoque” quando `stock > 0`, senão “Sob encomenda”).
- No celular o card inteiro é clicável e a área de toque dos botões tem no mínimo 44 px. Não coloque botão de compra no card (a compra acontece na página do produto).
- Aceite: build ok; conferir em 375 px de largura que o preço não quebra em duas linhas feias e que o grid não estoura.

### Tarefa 3 — CPF/CNPJ mascarado por padrão no painel

- Novo componente client `components/admin/MaskedDoc.tsx`: mostra `529.•••.•••-25` / `12.•••.•••/••••-35` e um botão “mostrar” que revela o documento formatado (`formatTaxId` de `lib/domains/customers/tax-id.ts`).
- Usar em: lista de clientes (`app/admin/clientes/page.tsx`), página do pedido (`app/admin/pedidos/[id]/page.tsx`, bloco Cliente). **Não** mascarar dentro de formulários de edição nem no PDF do pedido.
- Função pura de máscara em `lib/domains/customers/tax-id.ts` (`maskTaxId`) com teste (CPF, CNPJ numérico e alfanumérico, valor inválido volta mascarado genérico).
- Aceite: `npm test` e build ok.

### Tarefa 4 — Vídeo no topo da home (para o material do Higgsfield)

- `components/public/sections/HomeHero.tsx`: suportar um vídeo de fundo **opcional** vindo de `/public/media/hero.mp4` + `hero.webm` + pôster `hero-poster.webp`.
- Regras: `muted`, `playsInline`, `loop`, `autoPlay`, `preload="none"` no celular (use `poster` e só carregue o vídeo em telas ≥ 768 px ou quando visível), respeitar `prefers-reduced-motion` (mostra só o pôster), overlay escuro para contraste do texto (AA), sem mudar o layout quando o vídeo não existir.
- Não commitar vídeos grandes: aceite arquivos até **4 MB**; documente no `README` onde colocar os arquivos.
- Aceite: build ok; sem vídeo a home fica idêntica à atual.

### Tarefa 5 — Acessibilidade e celular no módulo de custos

Em `components/admin/costing/*` e `app/admin/custos/**`:

- Botões só com ícone com `aria-label` (subir/descer/remover já têm; confira os demais); botões “Adicionar …” devem ter nome acessível igual ao texto visível (hoje o `title` sobrepõe).
- `SheetEditor` em telas < 640 px: cada linha empilha os campos em 2 colunas, sem rolagem horizontal; o resumo de custo/preço fica abaixo das linhas.
- Tabelas de materiais/notas com rolagem horizontal só dentro do card, cabeçalho legível.
- Aceite: build ok; sem mudança de regra de cálculo (os testes de `lib/domains/costing` continuam passando sem alteração).

## 3. Entrega

Ao terminar cada tarefa: `npm test` e `npm run build` verdes, um commit por tarefa (`feat(custos): …`, `feat(vitrine): …`), e um resumo curto do que mudou, como testou e o que ficou de fora.
