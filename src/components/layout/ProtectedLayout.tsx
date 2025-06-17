
"use client";

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
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

    const isAdminRoute = pathname.startsWith('/admin');
    const isClientUserManagementRoute = pathname === '/users';

    if (!isAuthenticated && pathname !== '/login') {
      router.push('/login');
    } else if (isAuthenticated && pathname === '/login') {
      router.push('/');
    } else if (isAuthenticated && isAdminRoute && !user?.isSuperAdmin) {
      toast({ variant: "destructive", title: "Access Denied", description: "You do not have permission to access this admin page." });
      router.push('/');
    } else if (isAuthenticated && isClientUserManagementRoute) {
      if (user?.isSuperAdmin) { // Super admins should use /admin/users
        toast({ variant: "destructive", title: "Access Denied", description: "Super admins should manage users via /admin/users." });
        router.push('/admin/users');
      } else if (!user?.clientId || user?.role !== 'admin') { // Client users must be admins of their client
        toast({ variant: "destructive", title: "Access Denied", description: "You do not have permission to manage users." });
        router.push('/');
      }
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
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
         <p className="ml-3 text-md text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }

  if (pathname.startsWith('/admin') && isAuthenticated && !user?.isSuperAdmin) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-md text-muted-foreground">Checking permissions...</p>
        </div>
    );
  }

  if (pathname === '/users' && isAuthenticated && user && !user.isSuperAdmin && user.role !== 'admin') {
     return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-md text-muted-foreground">Verifying user role...</p>
        </div>
    );
  }


  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (isAuthenticated) {
    return <AppShell>{children}</AppShell>;
  }

  return null;
}
