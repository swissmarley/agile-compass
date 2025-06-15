
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

export function useRequireAuth(redirectTo = '/login') {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Don't redirect until loading is complete
    if (loading) {
      return;
    }

    // If loading is finished and there's no user, redirect.
    if (!user) {
       const redirectUrl = `${redirectTo}?redirectTo=${encodeURIComponent(pathname)}`;
       router.push(redirectUrl);
    }
    // If user exists, stay on the current page.
  }, [user, loading, router, redirectTo, pathname]);

  // Optionally return loading state or user if needed by the component
  return { user, loading };
}
