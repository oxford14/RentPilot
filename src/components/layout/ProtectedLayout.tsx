
"use client";

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { Loader2 } from 'lucide-react';


export function ProtectedLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) {
      return; // Wait until authentication status is determined
    }

    if (!isAuthenticated && pathname !== '/login') {
      router.push('/login');
    } else if (isAuthenticated && pathname === '/login') {
      router.push('/'); // Redirect to dashboard if logged in and trying to access login page
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-lg text-muted-foreground">Loading application...</p>
      </div>
    );
  }

  // If not authenticated and not on the login page, router.push will handle it.
  // During the redirect, we can show a loading state or null to prevent flashing content.
  if (!isAuthenticated && pathname !== '/login') {
     return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
         <p className="ml-3 text-md text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }

  // If on the login page, render children directly (which is the LoginPage)
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // If authenticated and not on login page, render AppShell with children
  if (isAuthenticated) {
    return <AppShell>{children}</AppShell>;
  }

  // Fallback, should ideally not be reached if logic above is correct
  return null;
}
