# Deploy — L&E Torneadora (Vercel + Postgres gerenciado)

Não é preciso AWS. A Vercel roda o Next.js (site, painel, APIs, webhook e PDFs); o banco é um
Postgres gerenciado; as imagens ficam no Vercel Blob. Tudo tem plano gratuito para começar.

## 1. Código no GitHub
```bash
git push -u origin main
```
Repositório: https://github.com/Nicolas-Assis-F/sistemale

## 2. Banco de produção (escolha um)
- **Neon** (recomendado; pela Vercel: Storage → Create → Neon Postgres). Ela injeta `DATABASE_URL` sozinha.
- **Supabase**: Project Settings → Database → Connection string.
  - `DATABASE_URL` = pooler, porta 6543, com `?pgbouncer=true`;
  - `DIRECT_URL` = conexão direta, porta 5432.

Crie as tabelas e importe o catálogo a partir da sua máquina, apontando para o banco de produção:
```bash
DATABASE_URL="<url-producao>" DIRECT_URL="<url-direta>" npx prisma db push
DATABASE_URL="<url-producao>" npm run db:catalog
```

## 3. Projeto na Vercel
New Project → importe `sistemale` → Framework: Next.js (o build já roda `prisma generate`).
Em Storage → Create → **Blob** (gera `BLOB_READ_WRITE_TOKEN`).

### Variáveis de ambiente (Production)
| Variável | Valor |
|---|---|
| `DATABASE_URL` / `DIRECT_URL` | do passo 2 |
| `BLOB_READ_WRITE_TOKEN` | do Blob |
| `ADMIN_PASSWORD` | senha forte do painel |
| `AUTH_COOKIE_SECRET` | `openssl rand -hex 32` (**novo**, não reutilize o local) |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` (**novo**) |
| `BETTER_AUTH_URL` / `NEXT_PUBLIC_SITE_URL` | `https://seu-dominio.com.br` |
| `NEXT_PUBLIC_COMPANY_*` | nome, telefone, e-mail, endereço |
| `ASAAS_API_URL` | `https://api.asaas.com/v3` (produção) |
| `ASAAS_API_KEY` | chave `$aact_prod_…` (**na Vercel, sem a barra `\` antes do `$`**) |
| `ASAAS_WEBHOOK_TOKEN` | token aleatório (o mesmo do painel do Asaas) |
| `RESEND_API_KEY` / `EMAIL_FROM` | do Resend, com o domínio verificado |
| `ADMIN_NOTIFY_EMAIL` | e-mail que recebe os pedidos de orçamento do site |

Não defina `UPLOAD_STORAGE`, `AUTH_COOKIE_SECURE` nem `EMAIL_CONSOLE_FALLBACK` em produção.

## 4. Domínio
Vercel → Settings → Domains → adicione `seudominio.com.br` e `www`, e configure no registro.br:
- `A @ 76.76.21.21`
- `CNAME www cname.vercel-dns.com`

Depois atualize `NEXT_PUBLIC_SITE_URL` / `BETTER_AUTH_URL` e faça *Redeploy*.

## 5. Resend
Domains → adicione o domínio → crie no DNS os registros SPF/DKIM indicados → aguarde "Verified".
`EMAIL_FROM="L&E Torneadora <nao-responda@seudominio.com.br>"`.

## 6. Asaas (produção)
1. Integrações → Webhooks → **Novo webhook**:
   - URL `https://seudominio.com.br/api/webhooks/asaas`;
   - token = `ASAAS_WEBHOOK_TOKEN`;
   - eventos de **Cobrança**;
   - fila **ativa**.
2. Desative ou remova o webhook antigo (`nexadrill.shop`), que está com a fila interrompida.
3. Notificações de cobrança (e-mail/SMS/WhatsApp ao cliente): em Configurações → Notificações.
   O sistema cria os clientes com as notificações ligadas.
4. Confira que a conta do Asaas é a que deve receber o dinheiro (hoje ela está no CNPJ 55.011.626).

## 7. Primeiro acesso (checklist)
- [ ] `/admin/login` com a nova senha → cadastrar funcionários (salário/comissão)
- [ ] Produtos → clicar no preço de cada item e digitar o valor (Tab pula para o próximo)
- [ ] Criar um pedido de teste de R$ 5,00 → cobrar via PIX → pagar → ver "Pago" chegar pelo webhook
- [ ] Financeiro → lançar despesas fixas com "Repetir todo mês"; gerar a folha no fim do mês
- [ ] `/conta/entrar` → testar o link mágico no seu e-mail
