
"use client";

import * as React from 'react';
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
import { Home, Users, CreditCard, BarChart3, Settings, LogOut, Building, ShieldAlert, LayoutDashboard, Cog, ArrowLeft, Eye, UsersRound, UserCog, Clock, ShieldCheck } from 'lucide-react'; // Changed SuperAdminIcon to ShieldCheck
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useAppContext } from '@/contexts/AppContext';

interface AppNavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  clientAdminOnly?: boolean;
}

// Types for Admin Sidebar Configuration
interface AdminTopLevelNavItem {
  isGroup: false;
  href: string;
  label:string;
  icon: React.ElementType;
}

interface AdminNavSubItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

interface AdminNavGroup {
  isGroup: true;
  groupLabel: string;
  groupIcon: React.ElementType;
  items: AdminNavSubItem[];
}

type AdminSidebarConfigItem = AdminTopLevelNavItem | AdminNavGroup;


const appNavItems: AppNavItem[] = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/tenants', label: 'Tenants', icon: Users },
  { href: '/payments', label: 'Payments', icon: CreditCard },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/users', label: 'Manage Users', icon: UserCog, clientAdminOnly: true },
];

const adminSidebarConfig: AdminSidebarConfigItem[] = [
  { isGroup: false, href: '/admin', label: 'Admin Dashboard', icon: LayoutDashboard },
  { isGroup: false, href: '/admin/clients', label: 'Clients', icon: Building },
  { isGroup: false, href: '/admin/users', label: 'All Client Users', icon: UsersRound },
  {
    isGroup: true,
    groupLabel: 'System',
    groupIcon: Cog,
    items: [
      { href: '/admin/settings', label: 'Timezone Settings', icon: Clock },
      { href: '/admin/superadmin-users', label: 'Manage Super Admins', icon: ShieldCheck }, // Changed SuperAdminIcon to ShieldCheck
    ]
  }
];


export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user: authUser, logout } = useAuth();
  const { viewingAsClientId, clients, setViewMode } = useAppContext();

  const userInitials = authUser?.username ? authUser.username.substring(0, 2).toUpperCase() : 'TT';
  const isAdminSection = pathname.startsWith('/admin');

  let currentAppNavItems: AppNavItem[] = [];
  let currentAdminConfigItems: AdminSidebarConfigItem[] = [];
  let currentActivePageLabel = 'TenantTracker';


  if (isAdminSection) {
    if (authUser?.isSuperAdmin) {
      currentAdminConfigItems = adminSidebarConfig;
    }
    // Determine active page label for admin section
    let activeItemFound = false;
    for (const item of currentAdminConfigItems) {
      if (!item.isGroup && (pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href)))) {
        currentActivePageLabel = item.label;
        activeItemFound = true;
        break;
      }
      if (item.isGroup) {
        for (const subItem of item.items) {
          if (pathname === subItem.href || pathname.startsWith(subItem.href)) {
            currentActivePageLabel = subItem.label;
            activeItemFound = true;
            break;
          }
        }
      }
      if (activeItemFound) break;
    }
    if (!activeItemFound && pathname === '/admin') currentActivePageLabel = 'Admin Dashboard';


  } else {
    currentAppNavItems = appNavItems.filter(item => {
      if (item.clientAdminOnly) {
        return !authUser?.isSuperAdmin && !!authUser?.clientId && authUser?.role === 'admin';
      }
      return true;
    });
    const currentTopLevelPath = '/' + (pathname.split('/')[1] || '');
    const activeAppItem = currentAppNavItems.find(item =>
      item.href === '/' ? pathname === '/' : currentTopLevelPath === item.href || pathname.startsWith(item.href + '/')
    );
    currentActivePageLabel = activeAppItem?.label || 'TenantTracker';
  }

  const viewingClient = viewingAsClientId ? clients.find(c => c.id === viewingAsClientId) : null;
  const loggedInClient = authUser?.clientId ? clients.find(c => c.id === authUser.clientId) : null;


  const handleReturnToAdminView = () => {
    setViewMode(null);
    router.push('/admin');
  };

  const handleReturnToGlobalView = () => {
    setViewMode(null);
    router.push('/');
  }

  const getAccountLabel = () => {
    if (authUser?.isSuperAdmin && !viewingClient) return `${authUser.username} (Super Admin)`;
    if (viewingClient) return `${authUser?.username} (Viewing as ${viewingClient.name})`;
    if (loggedInClient && !authUser?.isSuperAdmin) {
      const roleLabel = authUser.role ? authUser.role.charAt(0).toUpperCase() + authUser.role.slice(1) : 'User';
      return `${authUser.username} (${roleLabel} at ${loggedInClient.name})`;
    }
    return authUser?.username || 'My Account';
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
              {isAdminSection ? (
                currentAdminConfigItems.map((item, index) => {
                  if (item.isGroup) {
                    return (
                      <React.Fragment key={`group-${item.groupLabel}-${index}`}>
                        <div className="px-2 py-2 mt-2 text-xs font-semibold text-sidebar-foreground/70 uppercase flex items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-2">
                          <item.groupIcon className="h-5 w-5 group-data-[collapsible=icon]:h-5 group-data-[collapsible=icon]:w-5" />
                          <span className="ml-2 group-data-[collapsible=icon]:hidden">{item.groupLabel}</span>
                        </div>
                        {item.items.map(subItem => (
                          <SidebarMenuItem key={subItem.href}>
                            <SidebarMenuButton
                              asChild
                              isActive={pathname === subItem.href || pathname.startsWith(subItem.href)}
                              tooltip={{ children: subItem.label, side: "right", className: "ml-2" }}
                              className="justify-start"
                            >
                              <Link href={subItem.href}>
                                <subItem.icon className="h-5 w-5" />
                                <span className="pl-3 group-data-[collapsible=icon]:hidden">{subItem.label}</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </React.Fragment>
                    );
                  } else { // AdminTopLevelNavItem
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))}
                          tooltip={{ children: item.label, side: "right", className: "ml-2" }}
                          className="justify-start"
                        >
                          <Link href={item.href}>
                            <item.icon className="h-5 w-5" />
                            <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  }
                })
              ) : (
                currentAppNavItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))}
                      tooltip={{ children: item.label, side: "right", className: "ml-2" }}
                      className="justify-start"
                    >
                      <Link href={item.href}>
                        <item.icon className="h-5 w-5" />
                        <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-2 border-t">
             <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton
                        tooltip={{ children: "Global Settings", side: "right", className: "ml-2" }}
                        className="justify-start"
                        onClick={() => alert("Global Settings clicked! Placeholder.")}
                        >
                        <Settings className="h-5 w-5" />
                        <span className="group-data-[collapsible=icon]:hidden">Global Settings</span>
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
                  {getAccountLabel()}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {authUser?.isSuperAdmin && viewingAsClientId && (
                  <DropdownMenuItem onClick={handleReturnToAdminView}>
                    <ShieldAlert className="mr-2 h-4 w-4" />
                    Return to Admin View
                  </DropdownMenuItem>
                )}

                {authUser?.isSuperAdmin && !viewingAsClientId && !isAdminSection && (
                  <DropdownMenuItem onClick={() => router.push('/admin')}>
                    <ShieldAlert className="mr-2 h-4 w-4" />
                    Go to Admin Dashboard
                  </DropdownMenuItem>
                )}

                {authUser?.isSuperAdmin && !viewingAsClientId && isAdminSection && (
                  <DropdownMenuItem onClick={handleReturnToGlobalView}>
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

