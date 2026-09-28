import Link from 'next/link';
import { requireCustomer } from '@/lib/customer-session';
import { ProfileForm } from '@/components/account/ProfileForm';
import { formatTaxId } from '@/lib/domains/customers/tax-id';
import { prisma } from '@/lib/db';
import { fiscalFormDefaults, principalAddressInclude } from '@/lib/domains/customers/fiscal-profile';

export default async function AccountDataPage({ searchParams }: { searchParams: Promise<{ completar?: string; next?: string }> }) {
  const { completar, next } = await searchParams;
  const back = next && next.startsWith('/vitrine/') ? next : null;
  const { session, customer: base } = await requireCustomer('/conta/dados');
  const customer = await prisma.customer.findUniqueOrThrow({ where: { id: base.id }, include: principalAddressInclude });
  return (
    <>
    {completar === 'pagamento' && (
      <div className="mb-6 max-w-3xl rounded-2xl border border-le-blue/25 bg-le-tint p-4 text-sm text-le-text">
        Para gerar o pagamento precisamos do seu <strong>CPF ou CNPJ</strong>. Preencha abaixo, salve e
        {back ? <> <Link href={back} className="font-semibold text-le-blue underline">volte para a compra</Link>.</> : ' volte para a compra.'}
      </div>
    )}
    <ProfileForm
      email={session.user.email}
      docLocked={Boolean(customer.asaasCustomerId && customer.doc)}
      defaults={{
        name: customer.name, doc: formatTaxId(customer.doc ?? ''), phone: customer.phone ?? '', contact: customer.contact ?? '',
      }}
      fiscal={fiscalFormDefaults(customer)}
    />
    </>
  );
}
