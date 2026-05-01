export const dynamic = 'force-dynamic';

import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="pb-20 md:pb-0">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
