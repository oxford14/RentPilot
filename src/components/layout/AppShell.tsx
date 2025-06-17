

"use client";

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Home, Users, CreditCard, BarChart3, Settings, LogOut, Building, ShieldAlert, LayoutDashboard, Cog, ArrowLeft, Eye, UsersRound } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useAppContext } from '@/contexts/AppContext'; 

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const appNavItems: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/tenants', label: 'Tenants', icon: Users },
  { href: '/payments', label: 'Payments', icon: CreditCard },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
];

const adminNavItems: NavItem[] = [
  { href: '/admin', label: 'Admin Dashboard', icon: LayoutDashboard },
  { href: '/admin/clients', label: 'Clients', icon: Users },
  { href: '/admin/users', label: 'Users', icon: UsersRound },
  { href: '/admin/settings', label: 'System Settings', icon: Cog },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { viewingAsClientId, clients, setViewMode } = useAppContext(); 

  const userInitials = user?.username ? user.username.substring(0, 2).toUpperCase() : 'TT';
  const isAdminSection = pathname.startsWith('/admin');

  let currentNavItemsToDisplay: NavItem[];
  let currentActivePageLabel = 'TenantTracker';

  if (isAdminSection) {
    currentNavItemsToDisplay = adminNavItems;
    const activeAdminItem = adminNavItems.find(item => pathname.startsWith(item.href) && (item.href === '/admin' ? pathname === '/admin' : true) );
    currentActivePageLabel = activeAdminItem?.label || 'Admin';
  } else {
    currentNavItemsToDisplay = appNavItems;
    const currentTopLevelPath = '/' + (pathname.split('/')[1] || '');
    const activeAppItem = currentNavItemsToDisplay.find(item =>
      item.href === '/' ? pathname === '/' : currentTopLevelPath === item.href || pathname.startsWith(item.href + '/')
    );
    currentActivePageLabel = activeAppItem?.label || 'TenantTracker';
  }

  const viewingClient = viewingAsClientId ? clients.find(c => c.id === viewingAsClientId) : null;

  const handleReturnToAdminView = () => {
    setViewMode(null);
    router.push('/admin');
  };

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full">
        <Sidebar variant="sidebar" collapsible="icon" side="left" className="border-r">
          <SidebarHeader className="p-4 flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-primary">
                <Building className="h-7 w-7 text-primary" />
                <span className="group-data-[collapsible=icon]:hidden font-headline">TenantTracker</span>
            </Link>
          </SidebarHeader>
          <SidebarContent className="flex-1 p-2">
            <SidebarMenu>
              {currentNavItemsToDisplay.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href || (item.href !== '/' && item.href !== '/admin' && pathname.startsWith(item.href))}
                    tooltip={{ children: item.label, side: "right", className: "ml-2" }}
                    className="justify-start"
                  >
                    <Link href={item.href}>
                      <item.icon className="h-5 w-5" />
                      <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-2 border-t">
             <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton
                        tooltip={{ children: "Settings", side: "right", className: "ml-2" }}
                        className="justify-start"
                        onClick={() => alert("Settings clicked!")}
                        >
                        <Settings className="h-5 w-5" />
                        <span className="group-data-[collapsible=icon]:hidden">Settings</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
             </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1 flex flex-col bg-background">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-card px-6 shadow-sm">
            <SidebarTrigger className="md:hidden" />
            <div className="flex-1">
              <h1 className="text-xl font-semibold font-headline">
                {currentActivePageLabel}
              </h1>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar>
                    <AvatarImage src="https://placehold.co/40x40.png" alt="User Avatar" data-ai-hint="user avatar"/>
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  {user?.username || 'My Account'}
                  {user?.isSuperAdmin && !viewingClient && " (Super Admin)"}
                  {viewingClient && ` (Viewing as ${viewingClient.name})`}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {user?.isSuperAdmin && viewingAsClientId && (
                  <DropdownMenuItem onClick={handleReturnToAdminView}>
                    <ShieldAlert className="mr-2 h-4 w-4" />
                    Return to Admin View
                  </DropdownMenuItem>
                )}
                {user?.isSuperAdmin && !viewingAsClientId && !isAdminSection && (
                  <DropdownMenuItem onClick={() => router.push('/admin')}>
                    <ShieldAlert className="mr-2 h-4 w-4" />
                    Go to Admin
                  </DropdownMenuItem>
                )}
                {user?.isSuperAdmin && !viewingAsClientId && isAdminSection && (
                  <DropdownMenuItem onClick={() => router.push('/')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to App (Global View)
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => alert("Profile clicked!")}>Profile</DropdownMenuItem>
                <DropdownMenuItem onClick={() => alert("Settings clicked!")}>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          {user?.isSuperAdmin && viewingClient && (
            <div className="bg-primary/10 text-primary-foreground py-2 px-6 text-sm flex items-center justify-center shadow">
              <Eye className="mr-2 h-4 w-4 text-primary" />
              You are currently viewing data for: <strong className="ml-1 font-semibold text-primary">{viewingClient.name}</strong>.
            </div>
          )}
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

