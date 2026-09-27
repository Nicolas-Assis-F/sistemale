import { Suspense } from 'react';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { FloatingWhatsApp } from '@/components/public/FloatingWhatsApp';
import { MotionProvider } from '@/components/public/MotionProvider';
import { CompareProvider } from '@/components/catalog/CompareProvider';
import { CompareTray } from '@/components/catalog/CompareTray';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <MotionProvider>
      <CompareProvider>
        <Suspense fallback={<div className="h-16 border-b bg-background" />}>
          <Header />
        </Suspense>
        <main className="flex-1">{children}</main>
        <Footer />
        <FloatingWhatsApp />
        <CompareTray />
      </CompareProvider>
    </MotionProvider>
  );
}
