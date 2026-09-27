import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { SignUpForm } from '@/components/account/AuthForms';

export const metadata: Metadata = { title: 'Criar conta' };

export default function SignUpPage() {
  return (
    <>
      <h1 className="font-heading text-[1.75rem] font-medium tracking-[-0.04em]">Criar sua conta</h1>
      <p className="mt-2 text-sm text-le-muted">Se você já comprou com a L&E, use o mesmo e-mail: seus pedidos aparecem automaticamente.</p>
      <div className="mt-7">
        <Suspense>
          <SignUpForm />
        </Suspense>
      </div>
      <p className="mt-7 text-center text-sm text-le-muted">
        Já tem conta? <Link href="/conta/entrar" className="font-semibold text-le-blue hover:underline">Entrar</Link>
      </p>
    </>
  );
}
