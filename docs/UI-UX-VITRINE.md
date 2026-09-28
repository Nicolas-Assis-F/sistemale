# Vitrine L&E — revisão visual de 28/09/2026

## Entrega

- Abertura editorial da vitrine com fotografia industrial, azul elétrico, amarelo, acesso ao catálogo e contato direto com a fábrica.
- Cards compartilhados entre home e vitrine: fotos reais, especificações visíveis, preços maiores, cotação e detalhes sempre acessíveis, comparação e visualização rápida. Hover sutil, transições de 200–300 ms e respeito a movimento reduzido.
- Ofertas a partir do campo existente `originalPriceCents`: selo, preço anterior riscado, preço atual e economia. Só aparecem com preço atual positivo e anterior maior; produtos sem preço mantêm “Sob cotação”. Sem urgência, descontos ou condições inventadas.
- Mesmo componente de preço nos cards, na visualização rápida e na página do produto.
- Novas imagens institucionais na vitrine, home e Sobre, identificadas como ilustrações geradas por IA. Fotos dos produtos preservadas.
- Grupos de filtros acessíveis por teclado, descrição no painel móvel e retorno explícito do foco ao card quando a visualização rápida fecha.

## Arquivos principais

- `app/globals.css`: superfícies, cards, preços, hover, responsividade e movimento reduzido, dentro de `@layer components`.
- `components/catalog/CatalogHero.tsx`, `CatalogExplorer.tsx`: apresentação, filtros e navegação.
- `components/catalog/MotionProductCard.tsx`, `ProductPrice.tsx`, `ProductQuickView.tsx`, `FeaturedShowcase.tsx`: cards e jornada de cotação.
- `lib/catalog.ts`, `lib/catalog-offers.ts`: exposição do preço anterior já cadastrado e validação de apresentação de oferta.
- `app/(public)/vitrine/page.tsx`, `app/(public)/vitrine/[slug]/page.tsx`, `app/(public)/sobre/page.tsx`, `components/landing/LandingPage.tsx`.
- `public/brand/vitrine-usinagem-v2.webp` (1600 × 900, 89.980 bytes).
- `public/brand/sobre-precisao-v2.webp` (1536 × 1024, 157.000 bytes).

## Contraste

As superfícies e textos novos usam os tokens da marca. Referência de cinza legado `#9a9cb1` sobre branco: **2,70:1**. Token `--le-text-muted: #62657d`: **5,71:1** sobre branco e **5,11:1** sobre `--le-tint`. Texto branco sobre `--le-blue: #3158ef`: **5,57:1**. `--le-ink: #0b0a3b` sobre `--le-yellow: #f7cd47`: **12,29:1**.

A auditoria detectou e corrigiu a contagem de categoria com branco translúcido sobre azul e o texto secundário no card azul de Sobre. Todos os textos funcionais novos têm pelo menos 11 px.

## Imagens: origem e prompts

O Higgsfield foi consultado e recebeu um projeto para esta rodada. A tentativa de geração retornou “Requires basic plan or higher.” Nenhuma geração foi concluída por ele. As duas imagens foram produzidas com a ferramenta nativa **ImageGen**, seguindo a skill `imagegen`, e convertidas para WebP com Sharp já disponível no projeto. Não representam fotografias documentais da fábrica.

### Vitrine

Arquivo final: `public/brand/vitrine-usinagem-v2.webp`.

Prompt usado:

> Use case: photorealistic-natural. Asset: high-end industrial website hero, wide landscape 16:9, 1536px or greater. Create a cinematic editorial close-up photograph of an authentic CNC lathe cutting a substantial cylindrical stainless steel drill coupling, beautifully machined circular threads and fine curled metal swarf. Subject concentrated center-right, upper left calm dark navy negative space. Shallow depth of field, realistic metal machining marks, sophisticated electric cobalt blue reflection on steel from the left, a warm golden edge light from the right, dark organized workshop background. Premium precise engineering mood, physically plausible machining, striking elegant composition, not a 3D render, no sci-fi. This is a conceptual editorial illustration, not a photo of an actual named factory. No people, no hands, no sparks, no text, no logos, no watermarks. Deliver one single photograph, no collage.

### Sobre e apresentação institucional da home

Arquivo final: `public/brand/sobre-precisao-v2.webp`.

Prompt usado:

> Use case: photorealistic-natural. Asset: editorial About section of a premium Brazilian precision-machining and water-well drilling equipment manufacturer website. Create one high quality landscape photograph, 3:2 composition. A curated trio of real heavy machined stainless steel threaded drill couplings and a precision vernier caliper resting on a clean solid workbench. One broad cylindrical steel coupling standing at a slight angle, one shorter coupling showing circular internal threads, one straight steel shaft, authentic tool marks, matte metal and brushed machining textures. Foreground center and left in crisp focus, blurred contemporary industrial workshop in the distance, authentic workshop not a sterile futuristic lab. Cobalt blue structural machinery accents, warm golden morning light entering through high windows and raking across the polished metal. Premium editorial photography, sophisticated restrained art direction, tactile craftsmanship, cinematic depth and rich contrast, honest physical realism. Conceptual image, not documentation of an actual named factory. No people, no hands, no readable measurements, no writing, no text, no logos, no watermarks, no collage.

## Limites do escopo

Não foram alterados schema, regras financeiras, dados de produtos, URLs ou mensagens de WhatsApp. Nenhuma dependência foi adicionada ao projeto. Playwright, axe-core e Lighthouse são ferramentas temporárias de verificação, fora do repositório. Não foi feita publicação em produção nem no Higgsfield. A consolidação anterior do painel permanece na base do projeto; esta rodada concentra-se na vitrine pública.

## Verificação final

- `npm run build`: código 0, Next 16.2.6; variáveis locais carregadas com `@next/env` antes de executar o script. Nenhum `next dev` executado.
- `npx tsc --noEmit` e `git diff --check`: aprovados.
- Home, vitrine, Sobre e AR-100: 375, 768 e 1440 px, sem rolagem horizontal, sem imagens quebradas observadas e sem erros JavaScript.
- axe-core nas quatro páginas, em 375 e 1440 px: nenhuma violação nos conjuntos WCAG 2 A/AA, 2.1 AA e 2.2 AA. Auditoria completa adicional na vitrine após os ajustes: nenhuma violação.
- Busca de AR-100 reduz 13 resultados a 1 e preserva `?q=AR-100`; modo lista, comparação, painel de filtros e visualização rápida funcionais. Esc fecha os painéis; foco retorna ao acionador. Movimento reduzido desativa as transformações das fotos.
- Sete cenários de ofertas: redução válida, preço zero, preços iguais, preço anterior menor, ausência de preço anterior, preço negativo e desconto inferior a 1%.
- Formato `[SKU] Olá! Tenho interesse…` conferido no link de cotação, sem enviar mensagem.

### Lighthouse mobile local

| Página | Performance | Acessibilidade |
| --- | ---: | ---: |
| Home | 88 | 100 |
| Vitrine (última execução) | 83 | 100 |
| AR-100 | 84 | 100 |

A meta de performance ≥90 **não foi atingida** nesta medição local. O LCP simulado ficou entre 3,9 e 4,4 s; na vitrine não houve deslocamento de layout (CLS 0). A primeira medição da vitrine foi 85, e a posterior, após ajustar os tamanhos das miniaturas, foi 83: variação de laboratório, não evidência de ganho. Os próximos trabalhos de performance devem focar o caminho de renderização inicial e JavaScript compartilhado, medindo também no ambiente de produção. As pontuações são diagnósticos locais, não garantias de resultado em dispositivos reais.

Teste final de teclado: 35 avanços de Tab no painel de filtros e 30 na visualização rápida mantiveram o foco no ciclo modal, incluindo os sentinelas internos do Base UI; Esc devolveu o foco ao acionador nos dois casos.

Prévia visual: [vitrine-preview.webp](./vitrine-preview.webp).
