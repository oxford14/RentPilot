
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

    const publicRoutes = ['/login', '/forgot-password', '/tenant-signup'];
    const isPublicRoute = publicRoutes.includes(pathname);

    // If not authenticated and not on a public route, redirect to login
    if (!isAuthenticated && !isPublicRoute) {
      router.push('/login');
      return;
    }

    // If authenticated...
    if (isAuthenticated) {
      if (pathname === '/login' || pathname === '/tenant-signup') {
        if (user?.isSuperAdmin) {
          router.push('/admin');
        } else {
          router.push('/');
        }
        return;
      }
      
      const isSuperAdmin = user?.isSuperAdmin;
      const isClientAdmin = user?.role === 'admin';
      const isTenant = user?.role === 'tenant';

      const isClientAdminRoute = pathname === '/users';
      const isClientSettingsRoute = pathname === '/settings';
      const isAdminRoute = pathname.startsWith('/admin');
      
      // Super Admin Checks
      if (isSuperAdmin) {
        if (isClientAdminRoute) {
          toast({ variant: "destructive", title: "Access Denied", description: "Super admins should manage users via /admin/users." });
          router.push('/admin/users');
        } else if (isClientSettingsRoute) {
          toast({ variant: "default", title: "Redirecting", description: "Super admins use /admin/settings for system-wide configurations." });
          router.push('/admin/settings');
        }
      }
      
      // Client Admin Checks
      if (isClientAdmin) {
        if (isAdminRoute) {
          toast({ variant: "destructive", title: "Access Denied", description: "You do not have permission to access admin pages." });
          router.push('/');
        }
      }

      // Tenant Checks
      if (isTenant) {
        const allowedTenantRoutes = ['/', '/profile'];
        if (!allowedTenantRoutes.includes(pathname)) {
          toast({ variant: "destructive", title: "Access Denied", description: "You do not have permission to access this page." });
          router.push('/');
        }
      }

      // General user type checks for specific routes
      if (!isSuperAdmin && isAdminRoute) {
        toast({ variant: "destructive", title: "Access Denied", description: "You do not have permission to access admin pages." });
        router.push('/');
      }

      if (!isClientAdmin && isClientAdminRoute) {
        toast({ variant: "destructive", title: "Access Denied", description: "You must be a client administrator to manage users." });
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

  // If page is public, render it without the shell
  const isPublicRoute = ['/login', '/forgot-password', '/tenant-signup'].includes(pathname);
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // If authenticated, render with the AppShell
  if (isAuthenticated) {
    return <AppShell>{children}</AppShell>;
  }

  // Fallback for unauthenticated users on protected routes (shows loading while redirecting)
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
       <p className="ml-3 text-md text-muted-foreground">Redirecting...</p>
    </div>
  );
}
