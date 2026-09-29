# Roteiro de visuais — Higgsfield (L&E Torneadora)

Objetivo: vídeos e imagens de marketing para o site, WhatsApp e redes, **sem inventar produto**.

## Regra de ouro

- **Produto sempre a partir da foto real** (image-to-video / referência de imagem). A peça no vídeo precisa ser a que vendemos: formato, rosca, cor e proporção. Gerar “uma perfuratriz qualquer” e usar como foto do produto é propaganda enganosa (CDC art. 37).
- Imagem 100% gerada serve para **cena/ambiente** (poço, obra, oficina), nunca como foto de catálogo.
- Nada de logotipo de outras marcas, pessoas reais identificáveis ou texto gerado pela IA dentro da imagem (sai com erros). Texto a gente coloca depois.
- Fotos de base: `public/catalogo/*.webp` (haste-if, haste-regular, cabecote-80m/120m/250m, bit-cir110, ar-100…). Para vídeo, prefira a versão em alta do fotógrafo ou foto nova com fundo neutro.

## Formatos e onde entram

| Peça | Formato | Duração | Uso |
| --- | --- | --- | --- |
| Hero da home | 16:9, 1920×1080, mp4 (H.264) + webm, **≤ 4 MB**, sem áudio | 6–10 s em loop | `public/media/hero.mp4` (Tarefa 4 do Codex) + pôster `hero-poster.webp` |
| Reels / Status | 9:16, 1080×1920 | 8–15 s | Instagram, WhatsApp Status |
| Posts | 1:1, 1080×1080 (imagem ou vídeo curto) | até 10 s | Instagram / Facebook |
| Capa de categoria | 4:3 imagem, 1600×1200 webp | — | Admin → Categorias (substituir capas) |

Depois de gerar, comprimir o hero (ex.: HandBrake, perfil web, ~2–3 Mbps) para caber em 4 MB.

## Lista de cenas (prompts em inglês funcionam melhor)

1. **Hero — perfuração ao pôr do sol** (cena, sem produto em destaque)
   > Cinematic wide shot of a water well drilling rig working in Brazilian cerrado at golden hour, dust and mist catching warm light, slow dolly-in, shallow depth of field, industrial and heroic mood, no text, no logos, 16:9.

2. **Haste girando (a partir da foto `haste-if.webp`)**
   > Slow 360° turntable rotation of this exact steel drill rod on a dark graphite studio background, soft rim light highlighting the machined threads, subtle reflections, product stays identical to the reference, macro detail at the thread, 16:9 and 1:1.

3. **Tool joint / rosca em macro**
   > Extreme macro dolly along the API threaded connection of this steel tool joint, oil sheen on the threads, sparks of light, shallow depth of field, industrial precision, keep geometry identical to the reference photo.

4. **Oficina / usinagem (cena)**
   > Inside a clean metalworking shop in Brazil, CNC lathe cutting a thick steel bar, coolant spray and metal chips flying in slow motion, blue and orange lighting accents, documentary style, no faces visible, no logos.

5. **Cabeçote hidráulico em ação (a partir da foto `cabecote-120m.webp`)**
   > This exact hydraulic drilling head mounted on a rig, gentle rotation, water and mud splashing at the bottom, late afternoon light, camera slowly orbits, keep the product shape and color identical to the reference.

6. **Água saindo do poço (fechamento)**
   > Close-up of clear water gushing from a freshly drilled well pipe into sunlight, droplets frozen in slow motion, hopeful mood, rural Brazil background out of focus.

7. **Reel 9:16 “do aço ao poço”** — montar com as cenas 4 → 3 → 2 → 1 → 6 (cortes de 1,5–2 s). Texto (colocar na edição, não na IA): “Fabricação própria em Goiás” · “Rosca API usinada em CNC” · “Peça no site: nexadrill.shop”.

## Paleta e estilo

Tons do site: azul-marinho profundo (#0b0a3b), azul (#3158ef), laranja de destaque, aço/grafite. Luz quente de fim de tarde para cenas externas; estúdio escuro com recorte de luz para produto.

## Checklist antes de publicar

- [ ] Produto idêntico à peça real (rosca, proporção, cor)?
- [ ] Sem texto/logos gerados pela IA, sem rostos identificáveis?
- [ ] Hero ≤ 4 MB, sem áudio, com pôster?
- [ ] Direitos de uso do plano do Higgsfield permitem uso comercial?
