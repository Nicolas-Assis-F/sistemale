import { Suspense } from 'react';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={<div className="h-16 border-b bg-background" />}>
        <Header />
      </Suspense>
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
