import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { SignInForm } from '@/components/account/AuthForms';

export const metadata: Metadata = { title: 'Entrar' };

/** Destino interno seguro para repassar entre login e cadastro. */
function nextParam(raw?: string) {
  return raw && raw.startsWith('/') && !raw.startsWith('//') && !raw.startsWith('/api') ? raw : null;
}


export default async function SignInPage({ searchParams }: { searchParams: Promise<{ senha?: string; erro?: string; next?: string }> }) {
  const { senha, erro, next: rawNext } = await searchParams;
  const next = nextParam(rawNext);
  const buying = next?.startsWith('/vitrine/');
  return (
    <>
      <h1 className="font-heading text-[1.75rem] font-medium tracking-[-0.04em]">Entrar na sua conta</h1>
      <p className="mt-2 text-sm text-le-muted">{buying ? 'Entre para finalizar sua compra. Você volta direto para o pagamento.' : 'Pedidos, pagamentos e orçamentos em um só lugar.'}</p>
      {senha === 'ok' && <p className="mt-5 rounded-xl bg-le-success-surface px-4 py-3 text-sm text-le-success">Senha alterada. Entre com a nova senha.</p>}
      {erro === 'link' && <p className="mt-5 rounded-xl bg-le-danger-surface px-4 py-3 text-sm text-le-danger">Link de acesso inválido ou expirado. Peça um novo.</p>}
      <div className="mt-7">
        <Suspense>
          <SignInForm />
        </Suspense>
      </div>
      <p className="mt-7 text-center text-sm text-le-muted">
        Primeira vez? <Link href={next ? `/conta/cadastro?next=${encodeURIComponent(next)}` : '/conta/cadastro'} className="font-semibold text-le-blue hover:underline">Criar conta</Link>
      </p>
    </>
  );
}
