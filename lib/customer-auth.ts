// Autenticação de CLIENTES (Better Auth) — separada do login do painel admin
// (lib/auth.ts, cookie admin_auth). Rotas em /api/cliente/*.
import 'server-only';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { magicLink } from 'better-auth/plugins';
import { nextCookies } from 'better-auth/next-js';
import { prisma } from '@/lib/db';
import { emailLayout, sendEmail } from '@/lib/email';

export const CUSTOMER_AUTH_BASE_PATH = '/api/cliente';

const siteUrl = (process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

/**
 * Origens aceitas nos POSTs de login/cadastro (proteção CSRF do Better Auth).
 * Além da URL configurada: a variante com/sem "www", o domínio de produção e a
 * URL do deploy atual informados pela Vercel, e extras em BETTER_AUTH_TRUSTED_ORIGINS
 * (separados por vírgula). Sem isso, trocar o domínio quebra o cadastro com
 * "Invalid origin" até alguém lembrar de atualizar a variável.
 */
function trustedOrigins() {
  const origins = new Set<string>();
  const add = (raw?: string) => {
    if (!raw) return;
    try {
      const url = new URL(raw.includes('://') ? raw : `https://${raw}`);
      origins.add(url.origin);
      if (url.hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(url.hostname)) return;
      const twin = new URL(url.origin);
      twin.hostname = url.hostname.startsWith('www.') ? url.hostname.slice(4) : `www.${url.hostname}`;
      if (!url.hostname.endsWith('.vercel.app')) origins.add(twin.origin);
    } catch {
      // valor inválido na variável: ignora
    }
  };
  add(siteUrl);
  add(process.env.NEXT_PUBLIC_SITE_URL);
  add(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  add(process.env.VERCEL_URL);
  for (const extra of (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? '').split(',')) add(extra.trim());
  return [...origins];
}

export const customerAuth = betterAuth({
  appName: 'L&E Torneadora',
  baseURL: siteUrl,
  basePath: CUSTOMER_AUTH_BASE_PATH,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: trustedOrigins(),
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  user: {
    additionalFields: {
      // vínculo com o cadastro comercial — nunca aceito do cliente (input: false)
      customerId: { type: 'string', required: false, input: false },
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: true, // só entra depois de confirmar o e-mail
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      const { html, text } = emailLayout({
        title: 'Redefinir sua senha',
        intro: `Olá, ${user.name.split(' ')[0]}. Recebemos um pedido para redefinir a senha da sua conta. O link vale por 1 hora.`,
        cta: { label: 'Criar nova senha', url },
        footnote: 'Se você não pediu, ignore este e-mail — sua senha continua a mesma.',
      });
      await sendEmail({ to: user.email, subject: 'Redefinir senha — L&E Torneadora', html, text });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      const { html, text } = emailLayout({
        title: 'Confirme seu e-mail',
        intro: `Olá, ${user.name.split(' ')[0]}! Confirme seu e-mail para acessar seus pedidos, orçamentos e pagamentos com a L&E Torneadora.`,
        cta: { label: 'Confirmar e-mail', url },
        footnote: 'Se você não criou esta conta, ignore este e-mail.',
      });
      await sendEmail({ to: user.email, subject: 'Confirme seu e-mail — L&E Torneadora', html, text });
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 dias
    updateAge: 60 * 60 * 24, // renova 1x/dia
  },
  advanced: { cookiePrefix: 'le-cliente' },
  rateLimit: { enabled: true, window: 60, max: 20 },
  plugins: [
    magicLink({
      expiresIn: 60 * 15,
      sendMagicLink: async ({ email, url }) => {
        const { html, text } = emailLayout({
          title: 'Seu link de acesso',
          intro: 'Clique no botão para entrar na sua conta da L&E Torneadora. O link vale por 15 minutos e só pode ser usado uma vez.',
          cta: { label: 'Entrar na minha conta', url },
          footnote: 'Se você não pediu este acesso, ignore este e-mail.',
        });
        await sendEmail({ to: email, subject: 'Seu link de acesso — L&E Torneadora', html, text });
      },
    }),
    nextCookies(), // precisa ser o último
  ],
});

export type CustomerSession = typeof customerAuth.$Infer.Session;
