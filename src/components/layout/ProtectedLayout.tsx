
"use client";

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast'; // Moved to top

export function ProtectedLayout({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const isAdminRoute = pathname.startsWith('/admin');

    if (!isAuthenticated && pathname !== '/login') {
      router.push('/login');
    } else if (isAuthenticated && pathname === '/login') {
      router.push('/');
    } else if (isAuthenticated && isAdminRoute && !user?.isSuperAdmin) {
      toast({ variant: "destructive", title: "Access Denied", description: "You do not have permission to access this page." });
      router.push('/');
    }
  }, [isAuthenticated, isLoading, pathname, router, user]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-lg text-muted-foreground">Loading application...</p>
      </div>
    );
  }

  if (!isAuthenticated && pathname !== '/login') {
     // This state handles the brief period before useEffect redirects.
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
         <p className="ml-3 text-md text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }
  
  // If authenticated but trying to access an admin route without super admin rights,
  // and useEffect hasn't completed redirection yet (e.g., on initial direct load).
  // This shows a temporary loading state while useEffect handles the toast and redirect.
  if (pathname.startsWith('/admin') && isAuthenticated && !user?.isSuperAdmin) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-md text-muted-foreground">Checking permissions...</p>
        </div>
    );
  }

  if (pathname === '/login') {
    return <>{children}</>;
  }

  // If authenticated and authorized for the current route (or if useEffect will handle redirection shortly).
  if (isAuthenticated) {
    return <AppShell>{children}</AppShell>;
  }

  // Fallback, should ideally be covered by earlier conditions.
  return null;
}
