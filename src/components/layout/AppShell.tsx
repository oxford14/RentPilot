
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
  adminOnly?: boolean; // Super admin only
  clientAdminOnly?: boolean; // For client users with rights to manage their own users
}

const appNavItems: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/tenants', label: 'Tenants', icon: Users },
  { href: '/payments', label: 'Payments', icon: CreditCard },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/users', label: 'Manage Users', icon: UsersRound, clientAdminOnly: true }, // New for client admins
];

const adminNavItems: NavItem[] = [
  { href: '/admin', label: 'Admin Dashboard', icon: LayoutDashboard, adminOnly: true },
  { href: '/admin/clients', label: 'Clients', icon: Building, adminOnly: true }, // Changed icon for clarity
  { href: '/admin/users', label: 'All Client Users', icon: UsersRound, adminOnly: true },
  { href: '/admin/settings', label: 'System Settings', icon: Cog, adminOnly: true },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user: authUser, logout } = useAuth();
  const { viewingAsClientId, clients, setViewMode } = useAppContext(); 

  const userInitials = authUser?.username ? authUser.username.substring(0, 2).toUpperCase() : 'TT';
  const isAdminSection = pathname.startsWith('/admin');

  let currentNavItemsToDisplay: NavItem[];
  let currentActivePageLabel = 'TenantTracker';

  if (isAdminSection) {
    currentNavItemsToDisplay = adminNavItems.filter(item => authUser?.isSuperAdmin); // Only super admins see admin nav
    const activeAdminItem = adminNavItems.find(item => pathname.startsWith(item.href) && (item.href === '/admin' ? pathname === '/admin' : true) );
    currentActivePageLabel = activeAdminItem?.label || 'Admin';
  } else {
    currentNavItemsToDisplay = appNavItems.filter(item => {
      if (item.clientAdminOnly) {
        return !authUser?.isSuperAdmin && !!authUser?.clientId; // Show only to client users
      }
      return true;
    });
    const currentTopLevelPath = '/' + (pathname.split('/')[1] || '');
    const activeAppItem = currentNavItemsToDisplay.find(item =>
      item.href === '/' ? pathname === '/' : currentTopLevelPath === item.href || pathname.startsWith(item.href + '/')
    );
    currentActivePageLabel = activeAppItem?.label || 'TenantTracker';
  }

  const viewingClient = viewingAsClientId ? clients.find(c => c.id === viewingAsClientId) : null;
  const loggedInClient = authUser?.clientId ? clients.find(c => c.id === authUser.clientId) : null;


  const handleReturnToAdminView = () => {
    setViewMode(null); // Clear viewingAsClientId
    router.push('/admin');
  };
  
  const handleReturnToGlobalView = () => {
    setViewMode(null); // Clear viewingAsClientId, super admin returns to their global app view
    router.push('/');
  }

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
                 {loggedInClient && !isAdminSection && ` - ${loggedInClient.name}`}
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
                  {authUser?.username || 'My Account'}
                  {authUser?.isSuperAdmin && !viewingClient && " (Super Admin)"}
                  {viewingClient && ` (Viewing as ${viewingClient.name})`}
                  {loggedInClient && !authUser?.isSuperAdmin && ` (${loggedInClient.name} User)`}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {authUser?.isSuperAdmin && viewingAsClientId && ( // Super admin viewing as client
                  <DropdownMenuItem onClick={handleReturnToAdminView}>
                    <ShieldAlert className="mr-2 h-4 w-4" />
                    Return to Admin View
                  </DropdownMenuItem>
                )}

                {authUser?.isSuperAdmin && !viewingAsClientId && !isAdminSection && ( // Super admin in global app view
                  <DropdownMenuItem onClick={() => router.push('/admin')}>
                    <ShieldAlert className="mr-2 h-4 w-4" />
                    Go to Admin Dashboard
                  </DropdownMenuItem>
                )}
                
                {authUser?.isSuperAdmin && !viewingAsClientId && isAdminSection && ( // Super admin in admin section, global view
                  <DropdownMenuItem onClick={handleReturnToGlobalView}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to App (Global View)
                  </DropdownMenuItem>
                )}

                {/* No specific client admin dropdown items for now, but could add "Switch Client" if they belong to multiple */}
                
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
          {authUser?.isSuperAdmin && viewingClient && (
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
