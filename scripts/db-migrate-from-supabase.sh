#!/usr/bin/env bash
#
# Migra os DADOS do Supabase para o Postgres local em Docker.
# Rode na SUA máquina (que alcança o Supabase), com o container já no ar:
#   docker compose up -d
#   SUPABASE_URL='postgresql://...' bash scripts/db-migrate-from-supabase.sh
#
# Preserva o catálogo existente (categorias, produtos, pedidos, conteúdo).
# Requer: pg_dump e psql (>= v15). Ex.: sudo apt install postgresql-client
set -euo pipefail

# URL de origem (Supabase, conexão direta na porta 5432).
# Receba por variável de ambiente ou como 1º argumento; nunca salve credenciais no script.
SUPABASE_URL="${1:-${SUPABASE_URL:-}}"
if [ -z "$SUPABASE_URL" ]; then
  echo "Defina SUPABASE_URL com a URL direta do banco de origem." >&2
  exit 1
fi

# URL de destino (Docker local — bate com o docker-compose.yml).
DOCKER_URL="${DOCKER_URL:-postgresql://letorneadora:letorneadora@localhost:55433/letorneadora}"

DUMP_FILE="$(dirname "$0")/../.supabase_public_dump.sql"

echo "▶ pg_dump $(pg_dump --version | awk '{print $3}')"
echo "▶ Origem : Supabase (schema public)"
echo "▶ Destino: PostgreSQL local configurado em DOCKER_URL"
echo

echo "1/3 · Testando conexão com o Supabase…"
psql "$SUPABASE_URL" -tAc "select 'ok'" >/dev/null
echo "     conexão OK."

echo "2/3 · Dump do schema public (estrutura + dados)…"
pg_dump "$SUPABASE_URL" \
  --schema=public --clean --if-exists \
  --no-owner --no-privileges --no-comments \
  --quote-all-identifiers \
  -f "$DUMP_FILE"
echo "     dump salvo em $DUMP_FILE ($(du -h "$DUMP_FILE" | cut -f1))."

echo "3/3 · Restaurando no Postgres do Docker…"
psql "$DOCKER_URL" -v ON_ERROR_STOP=1 --single-transaction -f "$DUMP_FILE" >/tmp/letorneadora_restore.log 2>&1
echo "     restaurado (avisos em /tmp/letorneadora_restore.log)."

echo
echo "✔ Contagens no banco local:"
for t in Category Product Order Customer SiteContent ServiceItem GalleryItem; do
  n=$(psql "$DOCKER_URL" -tAc "select count(*) from \"$t\"" 2>/dev/null || echo "?")
  printf "   %-14s %s\n" "$t" "$n"
done
echo
echo "✔ Pronto. Agora rode:  npm run build && npm run start"
echo "  (o app já está apontado para o Docker no .env / .env.local)"
