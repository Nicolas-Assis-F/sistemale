import type { Metadata } from 'next';
import { requireCustomer } from '@/lib/customer-session';
import { AccountNav } from '@/components/account/AccountNav';

export const metadata: Metadata = { title: 'Minha conta', robots: { index: false, follow: false } };

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const { customer } = await requireCustomer('/conta');
  return (
    <div className="le-container py-10 lg:py-14">
      <p className="le-kicker">Área do cliente</p>
      <h1 className="le-section-title mt-3">Olá, {customer.name.split(' ')[0]}.</h1>
      <div className="mt-6 border-b border-le-line pb-3">
        <AccountNav />
      </div>
      <div className="pt-8">{children}</div>
    </div>
  );
}
