import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ResetPasswordForm } from '@/components/account/AuthForms';

export const metadata: Metadata = { title: 'Nova senha' };

export default function ResetPage() {
  return (
    <>
      <h1 className="font-heading text-[1.75rem] font-medium tracking-[-0.04em]">Criar nova senha</h1>
      <p className="mt-2 text-sm text-le-muted">Escolha uma senha com pelo menos 8 caracteres.</p>
      <div className="mt-7">
        <Suspense>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </>
  );
}
