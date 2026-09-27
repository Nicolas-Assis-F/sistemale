import { requireCustomer } from '@/lib/customer-session';
import { ProfileForm } from '@/components/account/ProfileForm';

export default async function AccountDataPage() {
  const { session, customer } = await requireCustomer('/conta/dados');
  return (
    <ProfileForm
      email={session.user.email}
      docLocked={Boolean(customer.asaasCustomerId && customer.doc)}
      defaults={{
        name: customer.name, doc: customer.doc ?? '', phone: customer.phone ?? '', contact: customer.contact ?? '',
        address: customer.address ?? '', city: customer.city ?? '', state: customer.state ?? '', zip: customer.zip ?? '',
      }}
    />
  );
}
