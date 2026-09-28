import { requireCustomer } from '@/lib/customer-session';
import { ProfileForm } from '@/components/account/ProfileForm';
import { formatTaxId } from '@/lib/domains/customers/tax-id';

export default async function AccountDataPage() {
  const { session, customer } = await requireCustomer('/conta/dados');
  return (
    <ProfileForm
      email={session.user.email}
      docLocked={Boolean(customer.asaasCustomerId && customer.doc)}
      defaults={{
        name: customer.name, doc: formatTaxId(customer.doc ?? ''), phone: customer.phone ?? '', contact: customer.contact ?? '',
        address: customer.address ?? '', city: customer.city ?? '', state: customer.state ?? '', zip: customer.zip ?? '',
      }}
    />
  );
}
