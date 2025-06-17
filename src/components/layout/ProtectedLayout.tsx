
"use client";

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { Loader2 } from 'lucide-react';


export function ProtectedLayout({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth(); // Get user object
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
      // If trying to access admin route without super admin rights, redirect
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
     return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
         <p className="ml-3 text-md text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }
  
  // If accessing admin route without super admin rights (and not already caught by useEffect, e.g. direct load)
  if (pathname.startsWith('/admin') && !(user?.isSuperAdmin)) {
    // This check might be redundant if useEffect handles it quickly enough, but good for safety
    if (isAuthenticated) { // Only show access denied if they are logged in but not super admin
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-3 text-md text-muted-foreground">Access Denied. Redirecting...</p>
            </div>
        );
    }
    // If not authenticated, the above block handles redirect to login
  }


  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (isAuthenticated) {
    return <AppShell>{children}</AppShell>;
  }

  return null;
}

// This import was missing for toast
import { toast } from '@/hooks/use-toast';
