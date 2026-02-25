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
    if (isLoading) return;

    const publicRoutes = ['/login', '/terms', '/privacy-policy', '/signup'];
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
    const isForcePasswordChangeRoute = pathname.startsWith('/force-password-change');

    if (!isAuthenticated) {
      if (!isPublicRoute && !isForcePasswordChangeRoute) {
        router.push('/login');
      }
      return;
    }

    if (user?.temporaryPassword) {
      if (!isForcePasswordChangeRoute) {
        router.push('/force-password-change');
      }
      return;
    }

    if (!user?.temporaryPassword && isForcePasswordChangeRoute) {
      router.push('/');
      return;
    }
    
    if (isPublicRoute) {
       router.push(user?.isSuperAdmin ? '/admin' : '/');
       return;
    }
      
    const isSuperAdmin = !!user?.isSuperAdmin;
    const isClientAdmin = user?.role === 'admin';
    const isTenant = user?.role === 'tenant';
    const isHubAdmin = user?.role === 'hub-admin';
    const isRegularUser = user?.role === 'user';

    const hubAdminForbiddenRoutes = ['/users', '/payments', '/additional-dues', '/reports', '/company-funds', '/partner-earnings'];
    const pathIsAdmin = pathname.startsWith('/admin');
    const pathIsCompanyFunds = pathname.startsWith('/company-funds');
    const pathIsPartnerEarnings = pathname.startsWith('/partner-earnings');
    const pathIsClientAdminOnly = ['/users', '/notifications'].includes(pathname) && !pathname.startsWith('/announcements');
    const allowedTenantRoutes = ['/', '/profile', '/contract/sign', '/request-support'];
    const allowedClientAdminRoutesInAdmin = ['/admin/contracts'];

    if ((isHubAdmin || isRegularUser) && pathname.startsWith('/tracking')) {
        toast({ variant: "destructive", title: "Access Denied" });
        router.push('/');
        return;
    }
    
    if ((pathIsCompanyFunds || pathIsPartnerEarnings) && !isSuperAdmin && !isClientAdmin) {
       toast({ variant: "destructive", title: "Access Denied" });
       router.push('/');
       return;
    }
    
    if (isHubAdmin && hubAdminForbiddenRoutes.some(p => pathname.startsWith(p) && !['/expenses', '/announcements', '/notifications'].includes(p))) {
        toast({ variant: "destructive", title: "Access Denied" });
        router.push('/');
        return;
    }

    if (isSuperAdmin && pathIsClientAdminOnly) {
        toast({ variant: "destructive", title: "Access Denied" });
        router.push('/admin');
    }
    else if (isClientAdmin && pathIsAdmin && !allowedClientAdminRoutesInAdmin.some(p => pathname.startsWith(p))) {
        toast({ variant: "destructive", title: "Access Denied" });
        router.push('/');
    }
    else if (isTenant && !allowedTenantRoutes.some(p => pathname.startsWith(p) || pathname.startsWith('/ticket-support/'))) {
         toast({ variant: "destructive", title: "Access Denied" });
         router.push('/');
    }
  }, [isAuthenticated, isLoading, pathname, router, user]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (isAuthenticated && user?.temporaryPassword && !pathname.startsWith('/force-password-change')) {
     return (
       <div className="flex h-screen w-full items-center justify-center bg-background">
         <Loader2 className="h-8 w-8 animate-spin text-primary" />
       </div>
     );
  }

  const isAuthRoute = ['/login', '/terms', '/privacy-policy', '/force-password-change', '/signup'].some(route => pathname.startsWith(route));
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
    </div>
  );
}
