
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
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const publicRoutes = ['/login', '/forgot-password', '/terms', '/privacy-policy'];
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
    const isForcePasswordChangeRoute = pathname.startsWith('/force-password-change');

    // User is not authenticated
    if (!isAuthenticated) {
      if (!isPublicRoute && !isForcePasswordChangeRoute) {
        router.push('/login');
      }
      return; // Exit early
    }

    // User IS authenticated
    // Handle temporary password as a priority state
    if (user?.temporaryPassword) {
      if (!isForcePasswordChangeRoute) {
        router.push('/force-password-change');
      }
      return; // Exit early, this is the only page they should be on
    }

    // Handle case where user is on the change page but doesn't need to be
    if (!user?.temporaryPassword && isForcePasswordChangeRoute) {
      router.push('/');
      return;
    }
    
    // Handle case where authenticated user lands on a public route
    if (isPublicRoute) {
       router.push(user?.isSuperAdmin ? '/admin' : '/');
       return;
    }
      
    // Handle normal role-based access control for all other authenticated routes
    const isSuperAdmin = !!user?.isSuperAdmin;
    const isClientAdmin = user?.role === 'admin';
    const isTenant = user?.role === 'tenant';

    const pathIsAdmin = pathname.startsWith('/admin');
    const pathIsClientAdminOnly = ['/users', '/announcements'].includes(pathname);
    const allowedTenantRoutes = ['/', '/profile', '/contract/sign'];
    const allowedClientAdminRoutesInAdmin = ['/admin/contracts'];


    if (isSuperAdmin && pathIsClientAdminOnly) {
        toast({ variant: "destructive", title: "Access Denied", description: "This page is for Client Administrators." });
        router.push('/admin');
    }
    else if (isClientAdmin && pathIsAdmin && !allowedClientAdminRoutesInAdmin.some(p => pathname.startsWith(p))) {
        toast({ variant: "destructive", title: "Access Denied", description: "You do not have permission to access admin pages." });
        router.push('/');
    }
    else if (isTenant && !allowedTenantRoutes.some(p => pathname.startsWith(p))) {
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
