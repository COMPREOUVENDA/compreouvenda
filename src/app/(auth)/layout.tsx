'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // If the user hasn't seen the onboarding yet, redirect to it before login/register
    const done = localStorage.getItem('onboarding_completed');
    if (!done && pathname !== '/onboarding') {
      router.replace('/onboarding');
    }
  }, [pathname, router]);

  return <>{children}</>;
}
