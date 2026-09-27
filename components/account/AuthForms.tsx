'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, m } from 'motion/react';
import { ArrowRight, CircleAlert, Loader2, Mail, MailCheck, Sparkles } from 'lucide-react';
import { customerAuthClient as auth } from '@/lib/customer-auth-client';
import { PasswordField } from '@/components/admin/PasswordField';
import { cn } from '@/lib/utils';

/** Só aceita destinos internos (evita open redirect via ?next=//site.com). */
export function safeNext(raw: string | null, fallback = '/conta') {
  return raw && raw.startsWith('/') && !raw.startsWith('//') && !raw.startsWith('/api') ? raw : fallback;
}

const inputCls =
  'h-12 w-full rounded-xl border border-le-line bg-white px-4 text-[15px] text-le-text outline-none transition-[border-color,box-shadow] placeholder:text-le-muted/70 focus:border-le-blue focus:shadow-[0_0_0_4px_rgb(49_88_239/0.12)] aria-invalid:border-le-danger';

function Field({ label, ...props }: React.ComponentProps<'input'> & { label: string }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-medium tracking-wide text-le-text">{label}</span>
      <input {...props} className={inputCls} />
    </label>
  );
}

function Submit({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-le-blue text-sm font-semibold text-white shadow-[0_10px_30px_-12px_rgb(49_88_239/0.9)] transition-[background-color,transform] hover:bg-le-blue-hover active:scale-[0.99] disabled:cursor-wait disabled:opacity-75"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
      {!pending && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
    </button>
  );
}

function ErrorLine({ message }: { message: string }) {
  return (
    <AnimatePresence initial={false}>
      {message && (
        <m.p
          role="alert"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="flex items-start gap-2 overflow-hidden text-sm text-le-danger"
        >
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {message}
        </m.p>
      )}
    </AnimatePresence>
  );
}

function SentNotice({ email, title, text }: { email: string; title: string; text: string }) {
  return (
    <m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-le-success/25 bg-le-success-surface p-5 text-center">
      <MailCheck className="mx-auto h-8 w-8 text-le-success" />
      <p className="mt-3 font-heading text-lg font-medium text-le-text">{title}</p>
      <p className="mt-1 text-sm leading-6 text-le-muted">
        {text} <strong className="text-le-text">{email}</strong>.
      </p>
      <p className="mt-3 text-xs text-le-muted">Não chegou? Confira o spam ou tente de novo em 1 minuto.</p>
    </m.div>
  );
}

const ERRORS: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'E-mail ou senha incorretos.',
  EMAIL_NOT_VERIFIED: 'Confirme seu e-mail antes de entrar — reenviamos o link de confirmação.',
  USER_ALREADY_EXISTS: 'Já existe uma conta com este e-mail. Entre ou redefina a senha.',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'Já existe uma conta com este e-mail. Entre ou redefina a senha.',
  PASSWORD_TOO_SHORT: 'A senha precisa de pelo menos 8 caracteres.',
  INVALID_TOKEN: 'Link inválido ou expirado. Solicite um novo.',
};
const message = (e: { code?: string; message?: string; status?: number } | null | undefined, fallback: string) =>
  (e?.code && ERRORS[e.code]) || (e?.status === 429 ? 'Muitas tentativas. Aguarde um minuto.' : e?.message) || fallback;

// ─── Entrar ───────────────────────────────────────────────────────────────────

export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const [mode, setMode] = useState<'link' | 'senha'>('link');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(params.get('verificar') ? 'Confirme seu e-mail para acessar sua conta.' : '');
  const [sent, setSent] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setPending(true);
    if (mode === 'link') {
      const { error } = await auth.signIn.magicLink({ email, callbackURL: next, errorCallbackURL: '/conta/entrar?erro=link' });
      setPending(false);
      if (error) return setError(message(error, 'Não foi possível enviar o link.'));
      return setSent(true);
    }
    const { error } = await auth.signIn.email({ email, password, callbackURL: next });
    setPending(false);
    if (error) {
      if (error.code === 'EMAIL_NOT_VERIFIED') await auth.sendVerificationEmail({ email, callbackURL: next }).catch(() => {});
      return setError(message(error, 'Não foi possível entrar.'));
    }
    router.replace(next);
    router.refresh();
  }

  if (sent) return <SentNotice email={email} title="Link enviado" text="Enviamos um link de acesso para" />;

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div role="tablist" aria-label="Forma de acesso" className="grid grid-cols-2 gap-1 rounded-xl bg-le-subtle p-1">
        {([['link', 'Link por e-mail', Sparkles], ['senha', 'E-mail e senha', Mail]] as const).map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => { setMode(value); setError(''); }}
            className={cn(
              'relative flex h-10 items-center justify-center gap-2 rounded-lg text-xs font-semibold transition-colors',
              mode === value ? 'text-le-text' : 'text-le-muted hover:text-le-text',
            )}
          >
            {mode === value && <m.span layoutId="auth-tab" className="absolute inset-0 rounded-lg bg-white shadow-sm" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
            <Icon className="relative h-3.5 w-3.5" /> <span className="relative">{label}</span>
          </button>
        ))}
      </div>

      <Field label="E-mail" type="email" name="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com.br" />

      <AnimatePresence initial={false} mode="popLayout">
        {mode === 'senha' ? (
          <m.div key="pwd" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-2">
            <PasswordField tone="light" name="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Sua senha" />
            <Link href="/conta/esqueci-senha" className="inline-block text-xs font-medium text-le-blue hover:underline">Esqueci minha senha</Link>
          </m.div>
        ) : (
          <m.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs leading-5 text-le-muted">
            Sem senha: enviamos um link que entra na sua conta — e cria a conta se for seu primeiro acesso.
          </m.p>
        )}
      </AnimatePresence>

      <ErrorLine message={error} />
      <Submit pending={pending}>{mode === 'link' ? 'Enviar link de acesso' : 'Entrar'}</Submit>
    </form>
  );
}

// ─── Cadastro ─────────────────────────────────────────────────────────────────

export function SignUpForm() {
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) return setError(ERRORS.PASSWORD_TOO_SHORT);
    setPending(true);
    const { error } = await auth.signUp.email({ ...form, callbackURL: next });
    setPending(false);
    if (error) return setError(message(error, 'Não foi possível criar a conta.'));
    setSent(true);
  }

  if (sent) return <SentNotice email={form.email} title="Confirme seu e-mail" text="Enviamos o link de confirmação para" />;

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <Field label="Nome completo ou razão social" name="name" autoComplete="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <Field label="E-mail" type="email" name="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="voce@empresa.com.br" />
      <div className="space-y-1.5">
        <PasswordField tone="light" name="password" autoComplete="new-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo de 8 caracteres" />
        <div className="flex gap-1" aria-hidden>
          {[4, 8, 12].map((n) => (
            <span key={n} className={cn('h-1 flex-1 rounded-full transition-colors', form.password.length >= n ? 'bg-le-success' : 'bg-le-line')} />
          ))}
        </div>
      </div>
      <ErrorLine message={error} />
      <Submit pending={pending}>Criar conta</Submit>
    </form>
  );
}

// ─── Esqueci / redefinir senha ────────────────────────────────────────────────

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setPending(true);
    const { error } = await auth.requestPasswordReset({ email, redirectTo: '/conta/redefinir-senha' });
    setPending(false);
    // Resposta igual exista ou não a conta (não revela e-mails cadastrados)
    if (error && error.status === 429) return setError(message(error, ''));
    setSent(true);
  }

  if (sent) return <SentNotice email={email} title="Verifique seu e-mail" text="Se houver uma conta, enviamos o link para" />;

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <Field label="E-mail da conta" type="email" name="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <ErrorLine message={error} />
      <Submit pending={pending}>Enviar link de redefinição</Submit>
    </form>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(params.get('error') ? ERRORS.INVALID_TOKEN : '');

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!token) return setError(ERRORS.INVALID_TOKEN);
    if (password.length < 8) return setError(ERRORS.PASSWORD_TOO_SHORT);
    setPending(true);
    const { error } = await auth.resetPassword({ newPassword: password, token });
    setPending(false);
    if (error) return setError(message(error, 'Não foi possível redefinir a senha.'));
    router.replace('/conta/entrar?senha=ok');
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <PasswordField tone="light" label="Nova senha" name="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo de 8 caracteres" />
      <ErrorLine message={error} />
      <Submit pending={pending}>Salvar nova senha</Submit>
    </form>
  );
}
