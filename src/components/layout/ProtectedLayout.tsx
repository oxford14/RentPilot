"use client";

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AppProvider } from '@/contexts/AppContext';
import { AppShell } from '@/components/layout/AppShell';
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export function ProtectedLayout({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const publicRoutes = ['/login', '/forgot-password', '/terms', '/privacy-policy'];
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
    const isForcePasswordChangeRoute = pathname.startsWith('/force-password-change');

    if (!isAuthenticated && !isPublicRoute && !isForcePasswordChangeRoute) {
      router.push('/login');
      return;
    }

    if (isAuthenticated) {
      if (user?.temporaryPassword && !isForcePasswordChangeRoute) {
        router.push('/force-password-change');
        return;
      }
      
      if (!user?.temporaryPassword && isForcePasswordChangeRoute) {
        router.push('/');
        return;
      }
      
      if (isPublicRoute) {
         if (user?.isSuperAdmin) {
          router.push('/admin');
        } else {
          router.push('/');
        }
        return;
      }
      
      const isSuperAdmin = !!user?.isSuperAdmin;
      const isClientAdmin = user?.role === 'admin';
      const isTenant = user?.role === 'tenant';

      const pathIsAdmin = pathname.startsWith('/admin');
      const pathIsClientAdminOnly = ['/users', '/announcements'].includes(pathname);
      const allowedTenantRoutes = ['/', '/profile'];

      if (isSuperAdmin && pathIsClientAdminOnly) {
          toast({ variant: "destructive", title: "Access Denied", description: "This page is for Client Administrators." });
          router.push('/admin');
      }
      else if (isClientAdmin && pathIsAdmin) {
          toast({ variant: "destructive", title: "Access Denied", description: "You do not have permission to access admin pages." });
          router.push('/');
      }
      else if (isTenant && !allowedTenantRoutes.includes(pathname)) {
           toast({ variant: "destructive", title: "Access Denied", description: "You do not have permission to access this page." });
           router.push('/');
      }
    }
  }, [isAuthenticated, isLoading, pathname, router, user, logout]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-lg text-muted-foreground">Loading application...</p>
      </div>
    );
  }
  
  if (isAuthenticated && user?.temporaryPassword && !pathname.startsWith('/force-password-change')) {
     return (
       <div className="flex h-screen w-full items-center justify-center bg-background">
         <Loader2 className="h-8 w-8 animate-spin text-primary" />
         <p className="ml-3 text-md text-muted-foreground">Redirecting to password change...</p>
       </div>
     );
  }

  const isAuthRoute = ['/login', '/forgot-password', '/terms', '/privacy-policy', '/force-password-change'].some(route => pathname.startsWith(route));
  if (isAuthRoute) {
    return <>{children}</>;
  }

  if (isAuthenticated) {
    return (
      <AppProvider>
        <AppShell>{children}</AppShell>
      </AppProvider>
    );
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
       <p className="ml-3 text-md text-muted-foreground">Redirecting...</p>
    </div>
  );
}
