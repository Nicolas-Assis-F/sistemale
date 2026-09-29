# Segurança — L&E Torneadora

**Revisão:** 28/09/2026. **Escopo:** site, portal do cliente, painel, API, webhooks, dependências, segredos.
Este documento registra o que foi verificado, o que foi corrigido e o que ainda falta. Atualize a cada mudança relevante.

## 1. Regras da casa

1. **Segredo nunca vai para o navegador.** Só variáveis `NEXT_PUBLIC_*` chegam ao cliente, e nenhuma delas pode ser segredo (o teste `lib/security.test.ts` falha se aparecer `NEXT_PUBLIC_*KEY/SECRET/TOKEN/PASSWORD`).
2. **Módulos com segredo são `server-only`:** `lib/db.ts`, `lib/asaas.ts`, `lib/auth.ts`, `lib/email.ts`, `lib/customer-auth.ts`. Importar qualquer um deles num componente client quebra o build.
3. **Nada de segredo em tela, resposta HTTP ou log.** Painel mostra só "configurado/ausente" e dados mascarados (ex.: documento da conta Asaas `11••••••••81`). Erro de provedor (Asaas, Blob) vai para o log; o cliente vê mensagem genérica.
4. **Toda Server Action e toda página do admin checam a sessão no servidor.** O `proxy.ts` é só a primeira barreira (o Next já teve CVE de bypass do proxy). O teste falha se uma página/ação nova nascer sem guarda.
5. **O navegador nunca é autoridade:** preço, total, status "pago" e cliente vêm do banco/servidor.
6. **Segredos ficam na Vercel** (Environment Variables). Cópias locais (`.env`, `.env.vercel`) são gitignored e não devem circular por chat, e-mail ou print.

## 2. Verificado nesta revisão

| Item | Resultado |
| --- | --- |
| Segredos no histórico do git | Limpo (só a URL do Postgres local do Docker, sem risco) |
| Segredos no JavaScript público (`.next/static`, 92 arquivos) | Nenhum dos 8 segredos encontrado |
| Variáveis `NEXT_PUBLIC_*` | Só nome/e-mail/telefone/endereço/URL da empresa |
| Rotas `/api/*` protegidas sem login (produção) | CSV financeiro, PDFs, upload e cron → 401 |
| Páginas `/admin` e `/conta` sem login (produção) | Redirecionam para o login |
| Server Actions (58) | Todas checam sessão, exceto o formulário de contato (público de propósito) |
| Webhook Asaas | Token comparado em tempo constante; limite de tamanho; grava antes de responder |
| Cron | `Authorization: Bearer CRON_SECRET` em tempo constante |
| Portal do cliente | Pedidos e dados sempre filtrados pelo cliente da sessão (sem IDOR) |
| Link público do pedido | Token aleatório de 144 bits; não mostra CPF, endereço nem observações internas |
| Senhas de clientes | Better Auth (hash), e-mail verificado obrigatório, links de uso único |
| Logs | Não imprimem payload, CPF, chave ou token |

## 3. Corrigido nesta revisão

| Severidade | Problema | Correção |
| --- | --- | --- |
| **Crítica** | Next 16.2 com CVE de bypass do proxy + 34 páginas do admin protegidas **só** pelo proxy (dados de clientes expostos se o proxy fosse contornado) | Next 16.3.6; `await requireAdmin()` em todas as páginas do admin; teste de regressão |
| Alta | 17 vulnerabilidades em dependências (1 crítica, 10 altas) | `npm audit`: **0** |
| Alta | Login do admin sem limite de tentativas | 5 erros/15 min por IP → bloqueio + atraso por erro; log de tentativa recusada |
| Alta | Sessão do admin sem validade assinada e não revogável (7 dias; trocar a senha não derrubava sessões) | Token `v1` com validade assinada (3 dias); chave mistura `AUTH_COOKIE_SECRET` + hash da `ADMIN_PASSWORD` → trocar a senha derruba todas as sessões; falha fechada sem segredo forte |
| Média | Sem cabeçalhos de segurança | HSTS, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy, Permissions-Policy, CSP estrutural, `noindex`/`no-store` nas áreas privadas, `no-referrer` no link do pedido, sem `X-Powered-By` |
| Média | Erro do Asaas exibido ao cliente ("chave inválida") | Mensagem genérica; detalhe só no log |
| Média | E-mail impresso no log (modo teste) com links de login | Tokens mascarados sempre que roda na Vercel |
| Média | Formulário de contato sem anti-spam | Campo-armadilha + limites (3/h por e-mail, 30/10 min no site) |
| Baixa | Upload confiava no tipo informado pelo navegador e usava o nome original do arquivo | Tipo conferido pelos bytes do arquivo; nome gerado no servidor |
| Baixa | Comparação da senha do admin vazava o tamanho | Comparação por hash em tempo constante |

Efeito colateral esperado: **todos precisam entrar de novo no admin** depois do deploy (o formato do cookie mudou).

## 4. Ações do responsável (não dependem de código)

**Agora**

- [ ] **Trocar o token do webhook do Asaas** (Gerar Token no painel → atualizar `ASAAS_WEBHOOK_TOKEN` na Vercel → Redeploy). O token atual foi colado em conversa.
- [ ] **Trocar a senha pessoal que apareceu no print da tela de cadastro**, principalmente se ela é usada em outros serviços.
- [ ] Confirmar `CRON_SECRET` na Vercel (não está na cópia local `.env.vercel`).
- [ ] Ativar **2FA** em: GitHub, Vercel, Asaas, Resend, Prisma (banco), registro do domínio e o e-mail que recupera essas contas.
- [ ] Apagar o `.env.vercel` do computador depois de conferir (ou guardá-lo num gerenciador de senhas). Ele tem todos os segredos de produção.
- [ ] Revisar quem tem acesso ao projeto na Vercel e ao repositório no GitHub; ativar *secret scanning / push protection* no GitHub.

**Antes de vender em volume**

- [ ] Conta Asaas no CNPJ da L&E (hoje está no CNPJ pessoal) e chave de API nova nessa conta.
- [ ] Senha do admin forte e única (20+ caracteres) — ela é compartilhada até existir login individual (item 5.1).

## 5. Plano (próximas entregas)

| Prioridade | Entrega | Por quê |
| --- | --- | --- |
| P1 | **Login individual no admin** (Better Auth com papéis: vendas, financeiro, administrador) + **2FA** + `AuditLog` (quem viu/alterou o quê) | Hoje a senha é compartilhada: não há rastreabilidade nem como tirar o acesso de uma pessoa só |
| P1 | Limite de tentativas do login de clientes e do admin **no banco** (não só na memória da instância) | Na Vercel cada instância conta separado |
| P1 | **LGPD:** política de privacidade e termos (revisados por advogado), canal do titular (acesso/correção/exclusão), base legal por dado | Tratamos CPF/CNPJ, endereço, e-mail e telefone de clientes |
| P1 | **Retenção:** apagar `payload` de `WebhookInbox` após 180 dias; mensagens de contato após prazo definido; `Job` concluído após 90 dias | Guardar só o necessário |
| P2 | CPF/CNPJ **mascarado por padrão** nas listas do admin, revelado com clique (registrado no `AuditLog`) | Minimização de exposição na tela |
| P2 | Monitoramento de erros com remoção de dados pessoais (ex.: Sentry com scrubbing) e alerta de falha de webhook/pagamento | Saber de incidente antes do cliente |
| P2 | Backup do banco: confirmar política do Prisma Postgres e **testar uma restauração** | Backup sem teste não é backup |
| P2 | CSP com nonce para scripts | Endurece contra XSS |
| P2 | Dependabot/Renovate + `npm audit` no CI | Não voltar a acumular vulnerabilidades |
| P3 | Revisão de segurança antes de cada integração nova (Santander, provedor fiscal): segredos, mTLS, webhooks | Mesmo padrão desta revisão |

## 6. Como verificar de novo

```bash
npm test                    # inclui lib/security.test.ts (guardas de admin/actions/segredos)
npm audit --omit=dev        # dependências
```

Varredura de segredos no bundle público: gerar o build e procurar os valores do `.env` dentro de `.next/static` (procedimento usado nesta revisão; nenhum valor pode aparecer).
