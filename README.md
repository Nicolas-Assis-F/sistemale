# LE Torneadora

Site institucional, catálogo de produtos e painel administrativo em Next.js 16, Prisma e PostgreSQL.

## Rodar localmente

Requisitos: Node.js, npm e Docker com Compose.

```bash
cp .env.example .env.local
docker compose up -d db
npm install
npm run db:push
npm run dev
```

Abra `http://localhost:3000`. O painel fica em `http://localhost:3000/admin`. Antes de entrar, defina `ADMIN_PASSWORD` e um `AUTH_COOKIE_SECRET` longo em `.env.local`. Se a porta 3000 estiver ocupada, use `npm run dev -- -p 3100` e ajuste `NEXT_PUBLIC_SITE_URL`.

Para preencher um banco vazio com **dados de demonstração**, rode `npm run db:seed`. Não execute o seed sobre o catálogo real. Para conferir a versão de produção localmente, use `npm run build && npm run start -- -p 3100`; com HTTP local, `AUTH_COOKIE_SECURE=false` permite o login no painel.

## Catálogo e imagens

No painel, abra **Produtos → Importar CSV**. Baixe o modelo, preencha até 250 linhas e confira a prévia antes de importar. As categorias precisam existir previamente. Produtos com SKU ou URL já existente são ignorados e contabilizados; linhas inválidas impedem a importação inteira.

Com `UPLOAD_STORAGE=local`, os arquivos enviados pelo painel ficam em `data/uploads` e são servidos em `/media/`. Preserve esse diretório em backups e monte um volume persistente no servidor. Para usar Vercel Blob, configure `UPLOAD_STORAGE=blob` e `BLOB_READ_WRITE_TOKEN`.

## Migração do Supabase

Com o PostgreSQL local iniciado, use a URL direta de origem em uma variável de ambiente:

```bash
SUPABASE_URL='postgresql://usuario:senha@host:5432/postgres' bash scripts/db-migrate-from-supabase.sh
```

O script cria um dump local ignorado pelo Git e restaura o schema `public` em uma transação. Confira as contagens exibidas ao fim antes de usar o banco migrado. Guarde a URL de origem e o dump fora do repositório.

## Produção

Configure `DATABASE_URL`, `DIRECT_URL`, `ADMIN_PASSWORD`, `AUTH_COOKIE_SECRET` e `NEXT_PUBLIC_SITE_URL` no ambiente da instância. Use HTTPS e remova `AUTH_COOKIE_SECURE=false` para manter o cookie de sessão seguro. Preserve o volume do PostgreSQL e `data/uploads` nos backups. Execute `npm run build` e `npm run start` após configurar o banco.

## Redesign e catálogo oficial

As rotas principais são `/` (apresentação), `/vitrine` (busca e filtros instantâneos), `/vitrine/[slug]` (ficha técnica) e `/admin` (operação). As antigas rotas de busca, categoria e produto redirecionam para a vitrine.

O catálogo fornecido pelo cliente está em `data/catalogo/products.json`, com 13 referências em 7 linhas. Imagens extraídas do PDF ficam em `public/catalogo`. Para cadastrar os produtos em outro banco, rode `npm run db:catalog`. O comando preserva produtos já existentes e arquiva somente os quatro SKUs do seed de demonstração original. Os dados públicos e o painel usam a mesma base PostgreSQL.

Preço `0` representa **sob cotação**; não é exibido como produto gratuito. O PDF não informa valores nem estoque. Os SKUs `LE-*` são referências internas criadas para o sistema.

Paleta: azul da logo `#0b0a3b`, azul de ação `#3158ef`, amarelo técnico `#f7cd47`, superfícies `#f8f9fc`. A camada de componentes fica em `components/ui`, `components/catalog`, `components/landing` e `components/admin`. Animações respeitam a preferência de movimento reduzido.
