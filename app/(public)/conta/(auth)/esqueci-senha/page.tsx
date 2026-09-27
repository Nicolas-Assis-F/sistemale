import type { Metadata } from 'next';
import Link from 'next/link';
import { ForgotPasswordForm } from '@/components/account/AuthForms';

export const metadata: Metadata = { title: 'Recuperar senha' };

export default function ForgotPage() {
  return (
    <>
      <h1 className="font-heading text-[1.75rem] font-medium tracking-[-0.04em]">Recuperar senha</h1>
      <p className="mt-2 text-sm text-le-muted">Enviamos um link para você criar uma nova senha.</p>
      <div className="mt-7"><ForgotPasswordForm /></div>
      <p className="mt-7 text-center text-sm text-le-muted"><Link href="/conta/entrar" className="font-semibold text-le-blue hover:underline">Voltar para o login</Link></p>
    </>
  );
}
