'use client';

import { useState, type FormEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AnimatePresence, m, useAnimationControls } from 'motion/react';
import { ArrowRight, CircleAlert, Loader2, ShieldCheck } from 'lucide-react';
import { Brand } from '@/components/Brand';
import { PasswordField } from '@/components/admin/PasswordField';

type Status = 'idle' | 'loading' | 'success';

export default function AdminLoginPage() {
  const router = useRouter();
  const shake = useAnimationControls();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password) {
      setError('Digite a senha do painel.');
      shake.start({ x: [0, -8, 8, -5, 5, 0], transition: { duration: 0.4 } });
      return;
    }
    setError('');
    setStatus('loading');

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    }).catch(() => null);

    if (res?.ok) {
      setStatus('success');
      // Volta para a página que exigiu login (proxy.ts envia ?next=)
      const next = new URLSearchParams(window.location.search).get('next');
      router.replace(next?.startsWith('/admin') && !next.startsWith('/admin/login') ? next : '/admin');
      router.refresh();
      return;
    }

    const data = res ? await res.json().catch(() => ({})) : {};
    setStatus('idle');
    setError(res ? (data.error ?? 'Erro ao fazer login.') : 'Sem conexão com o servidor. Tente novamente.');
    shake.start({ x: [0, -8, 8, -5, 5, 0], transition: { duration: 0.4 } });
  }

  const busy = status !== 'idle';

  return (
    <div className="grid min-h-dvh bg-le-ink-deep text-white lg:grid-cols-[1.05fr_1fr]">
      {/* Painel de marca (desktop) */}
      <aside className="relative hidden overflow-hidden border-r border-white/8 lg:block">
        <Image
          src="/brand/usinagem-editorial.webp"
          alt=""
          fill
          priority
          sizes="(min-width:1024px) 52vw, 0px"
          className="scale-105 object-cover object-[62%_center]"
        />
        <div className="absolute inset-0 bg-linear-to-t from-le-ink-deep via-le-ink-deep/70 to-le-ink-deep/35" aria-hidden />
        <div className="absolute inset-0 bg-linear-to-r from-transparent to-le-ink-deep/60" aria-hidden />
        <div className="absolute inset-0 bg-blueprint opacity-25 mix-blend-overlay" aria-hidden />
        <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
          <Brand variant="dark" priority iconClassName="h-10 w-10" />
          <div>
            <p className="max-w-md font-heading text-3xl font-medium leading-tight tracking-[-0.04em] xl:text-[2.6rem]">
              Da usinagem à entrega,
              <br />
              <span className="text-white/70">tudo em um só painel.</span>
            </p>
            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-xs text-white/55">
              {['Catálogo', 'Pedidos & produção', 'Site institucional'].map((t) => (
                <span key={t} className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-le-yellow" /> {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Formulário */}
      <main className="relative flex items-center justify-center overflow-hidden px-5 py-12">
        <div className="absolute inset-0 bg-blueprint opacity-40 lg:hidden" aria-hidden />
        <m.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-[400px]"
        >
          <div className="mb-10 flex justify-center lg:hidden">
            <Brand variant="dark" priority iconClassName="h-11 w-11" />
          </div>

          <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/70">
            <ShieldCheck className="h-3.5 w-3.5 text-le-blue-light" /> Acesso restrito
          </p>
          <h1 className="mt-5 font-heading text-[2rem] font-medium leading-tight tracking-[-0.045em]">Bem-vindo de volta.</h1>
          <p className="mt-2 text-sm text-white/70">Entre com a senha do painel administrativo.</p>

          <m.form animate={shake} onSubmit={handleSubmit} className="mt-9 space-y-5" noValidate>
            {/* Campo de usuário oculto: ajuda gerenciadores de senha a salvar/preencher corretamente */}
            <input type="text" name="username" autoComplete="username" value="admin" readOnly hidden />

            <PasswordField
              name="password"
              autoComplete="current-password"
              autoFocus
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              disabled={busy}
              placeholder="••••••••"
              error={error || undefined}
            />

            <AnimatePresence initial={false}>
              {error && (
                <m.p
                  role="alert"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 overflow-hidden text-sm text-red-300"
                >
                  <CircleAlert className="h-4 w-4 shrink-0" /> {error}
                </m.p>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={busy}
              className="group relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-le-blue text-sm font-semibold text-white shadow-[0_10px_30px_-10px_rgb(49_88_239/0.9),inset_0_1px_0_rgb(255_255_255/0.18)] transition-[background-color,transform] duration-200 hover:bg-le-blue-hover active:scale-[0.99] disabled:cursor-wait disabled:opacity-80"
            >
              <span
                aria-hidden
                className="absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-linear-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-[300%]"
              />
              {status === 'loading' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Verificando…
                </>
              ) : status === 'success' ? (
                <>
                  <ShieldCheck className="h-4 w-4" /> Acesso liberado
                </>
              ) : (
                <>
                  Entrar no painel <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </m.form>

          <p className="mt-12 text-center text-[11px] text-white/70">L E TORNEADORA LTDA - ME · CNPJ 44.492.124/0001-07</p>
        </m.div>
      </main>
    </div>
  );
}
