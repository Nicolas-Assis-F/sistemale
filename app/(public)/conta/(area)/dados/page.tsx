import { requireCustomer } from '@/lib/customer-session';
import { ProfileForm } from '@/components/account/ProfileForm';
import { formatTaxId } from '@/lib/domains/customers/tax-id';
import { prisma } from '@/lib/db';
import { fiscalFormDefaults, principalAddressInclude } from '@/lib/domains/customers/fiscal-profile';

export default async function AccountDataPage() {
  const { session, customer: base } = await requireCustomer('/conta/dados');
  const customer = await prisma.customer.findUniqueOrThrow({ where: { id: base.id }, include: principalAddressInclude });
  return (
    <ProfileForm
      email={session.user.email}
      docLocked={Boolean(customer.asaasCustomerId && customer.doc)}
      defaults={{
        name: customer.name, doc: formatTaxId(customer.doc ?? ''), phone: customer.phone ?? '', contact: customer.contact ?? '',
      }}
      fiscal={fiscalFormDefaults(customer)}
    />
  );
}
