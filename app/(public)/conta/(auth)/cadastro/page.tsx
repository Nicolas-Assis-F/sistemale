import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { SignUpForm } from '@/components/account/AuthForms';

export const metadata: Metadata = { title: 'Criar conta' };

/** Destino interno seguro para repassar entre login e cadastro. */
function nextParam(raw?: string) {
  return raw && raw.startsWith('/') && !raw.startsWith('//') && !raw.startsWith('/api') ? raw : null;
}


export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = nextParam((await searchParams).next);
  const buying = next?.startsWith('/vitrine/');
  return (
    <>
      <h1 className="font-heading text-[1.75rem] font-medium tracking-[-0.04em]">Criar sua conta</h1>
      <p className="mt-2 text-sm text-le-muted">{buying ? 'Leva 1 minuto. Depois de confirmar o e-mail você volta direto para a compra.' : 'Se você já comprou com a L&E, use o mesmo e-mail: seus pedidos aparecem automaticamente.'}</p>
      <div className="mt-7">
        <Suspense>
          <SignUpForm />
        </Suspense>
      </div>
      <p className="mt-7 text-center text-sm text-le-muted">
        Já tem conta? <Link href={next ? `/conta/entrar?next=${encodeURIComponent(next)}` : '/conta/entrar'} className="font-semibold text-le-blue hover:underline">Entrar</Link>
      </p>
    </>
  );
}
