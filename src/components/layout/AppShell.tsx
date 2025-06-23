
"use client";

import * as React from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
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
  useSidebar, 
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Home, Users, CreditCard, BarChart3, Settings, LogOut, Building, ShieldAlert, LayoutDashboard, Cog, ArrowLeft, Eye, UsersRound, UserCog, Clock, ShieldCheck, ImageOff, ReceiptText, FileText, AreaChart, UserCircle } from 'lucide-react'; 
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'; 
import { useAuth } from '@/contexts/AuthContext';
import { useAppContext } from '@/contexts/AppContext';
import type { AppSidebarNavItem, AppNavGroup } from '@/lib/types'; 
import { cn } from '@/lib/utils';

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


const appNavItems: AppSidebarNavItem[] = [
  { isGroup: false, href: '/', label: 'Dashboard', icon: Home },
  { isGroup: false, href: '/tenants', label: 'Tenants', icon: Users },
  { isGroup: false, href: '/payments', label: 'Payments', icon: CreditCard },
  { isGroup: false, href: '/expenses', label: 'Expenses', icon: ReceiptText },
  {
    isGroup: true,
    label: 'Reports',
    icon: BarChart3,
    items: [
      { href: '/reports', label: 'Financial Summary', icon: FileText },
      { href: '/reports/earnings', label: 'Earnings Report', icon: AreaChart },
    ]
  },
  { isGroup: false, href: '/users', label: 'Manage Users', icon: UserCog, clientAdminOnly: true },
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
      { href: '/admin/superadmin-users', label: 'Manage Super Admins', icon: ShieldCheck },
    ]
  }
];

// Helper component for grouped app navigation items
const GroupedAppNavItem = ({ item, pathname }: { item: AppNavGroup; pathname: string }) => {
  const { state: sidebarState, isMobile: sidebarIsMobile } = useSidebar();
  const isGroupActive = item.items.some(subItem => pathname === subItem.href || pathname.startsWith(subItem.href));
  const showTooltip = sidebarState === 'collapsed' && !sidebarIsMobile;

  const trigger = (
    <AccordionTrigger
      className={cn(
        "flex w-full items-center rounded-md p-2 text-left text-sm font-medium outline-none ring-sidebar-ring transition-colors hover:no-underline focus-visible:ring-2",
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        "group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 group-data-[collapsible=icon]:justify-center",
        (isGroupActive && "data-[state=closed]:bg-sidebar-accent data-[state=closed]:text-sidebar-accent-foreground"),
        "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
      )}
    >
      <div className="flex flex-1 items-center gap-2">
        <item.icon className="h-5 w-5 shrink-0" />
        <span className="truncate group-data-[collapsible=icon]:hidden">{item.label}</span>
      </div>
    </AccordionTrigger>
  );

  return (
    <AccordionItem value={item.label} className="border-b-0">
      {showTooltip ? (
        <Tooltip>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent side="right" align="center" className="ml-2">
            {item.label}
          </TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}
      <AccordionContent className="group-data-[collapsible=icon]:hidden">
        <div className="pt-1 pb-1 pl-[calc(theme(spacing.2)_+_theme(spacing.4))] space-y-1">
          {item.items.map(subItem => (
            <SidebarMenuItem key={subItem.href} className="p-0">
              <SidebarMenuButton
                asChild
                size="sm"
                isActive={pathname === subItem.href || pathname.startsWith(subItem.href)}
                className="justify-start w-full"
              >
                <Link href={subItem.href}>
                  <subItem.icon className="h-4 w-4" />
                  <span className="pl-2">{subItem.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};


export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user: authUser, logout } = useAuth();
  const { viewingAsClientId, clients, setViewMode } = useAppContext();

  const userInitials = authUser?.username ? authUser.username.substring(0, 2).toUpperCase() : 'RP';
  const isAdminSection = pathname.startsWith('/admin');

  let currentAppNavItems: AppSidebarNavItem[] = [];
  let currentAdminConfigItems: AdminSidebarConfigItem[] = [];
  let currentActivePageLabel = 'RentPilot';


  if (isAdminSection) {
    if (authUser?.isSuperAdmin) {
      currentAdminConfigItems = adminSidebarConfig;
    }
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
    else if (!activeItemFound && pathname === '/admin/settings') currentActivePageLabel = 'Timezone Settings';
    else if (!activeItemFound && pathname === '/admin/superadmin-users') currentActivePageLabel = 'Manage Super Admins';


  } else { 
    currentAppNavItems = appNavItems.filter(item => {
      if (item.clientAdminOnly) {
        return !authUser?.isSuperAdmin && !!authUser?.clientId && authUser?.role === 'admin';
      }
      if (item.superAdminOnly) { 
          return !!authUser?.isSuperAdmin;
      }
      return true; 
    });

    let activeItemFound = false;
    for (const item of currentAppNavItems) {
      if (item.isGroup) {
        for (const subItem of item.items) {
          if (pathname === subItem.href || pathname.startsWith(subItem.href)) {
            currentActivePageLabel = subItem.label; 
            activeItemFound = true; 
            break;
          }
        }
      } else { 
        const currentTopLevelPath = '/' + (pathname.split('/')[1] || '');
        if (item.href === '/' ? pathname === '/' : currentTopLevelPath === item.href || pathname.startsWith(item.href + '/')) {
          currentActivePageLabel = item.label;
          activeItemFound = true;
        }
      }
      if (activeItemFound) break;
    }
     if (!activeItemFound && pathname === '/profile') currentActivePageLabel = 'User Profile';
     else if (!activeItemFound && pathname === '/settings') currentActivePageLabel = 'Account Settings';
     else if (!activeItemFound) currentActivePageLabel = 'RentPilot'; 
  }

  const viewingClient = viewingAsClientId ? clients.find(c => c.id === viewingAsClientId) : null;
  const loggedInClient = authUser?.clientId ? clients.find(c => c.id === authUser.clientId) : null;
  const activeClientForDisplay = viewingClient || loggedInClient;


  const handleReturnToAdminView = () => {
    setViewMode(null);
    router.push('/admin');
  };

  const handleReturnToGlobalView = () => {
    setViewMode(null);
    router.push('/');
  }

  const handleUserDropdownSettingsClick = () => {
    if (authUser?.isSuperAdmin) {
      router.push('/admin/settings'); 
    } else {
      router.push('/settings'); 
    }
  };
  
  const handleSidebarFooterSettingsClick = () => {
    if (authUser?.isSuperAdmin) {
      router.push('/admin/settings'); 
    } else {
      router.push('/profile'); 
    }
  };

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
                <Image 
                  src="https://placehold.co/100x32.png" 
                  alt="RentPilot Logo Placeholder" 
                  width={28} 
                  height={28} 
                  className="h-7 w-7 object-contain" 
                  data-ai-hint="app logo"
                  unoptimized
                />
                <span className="group-data-[collapsible=icon]:hidden font-headline">
                  {isAdminSection && !viewingClient ? 'RentPilot' : activeClientForDisplay?.name || 'RentPilot'}
                </span>
            </Link>
          </SidebarHeader>
          <SidebarContent className="flex-1 p-2">
            <SidebarMenu>
              {isAdminSection ? (
                currentAdminConfigItems.map((item, index) => {
                  if (item.isGroup) {
                    return (
                      <React.Fragment key={`admin-group-${item.groupLabel}-${index}`}>
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
                  } else { 
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
                currentAppNavItems.map((item, index) => {
                  if (item.isGroup) {
                    const isGroupActiveForAccordion = item.items.some(subItem => pathname === subItem.href || pathname.startsWith(subItem.href));
                    return (
                       <Accordion type="single" collapsible className="w-full" key={`app-group-${item.label}-${index}`} defaultValue={isGroupActiveForAccordion ? item.label : undefined}>
                        <GroupedAppNavItem item={item as AppNavGroup} pathname={pathname} />
                      </Accordion>
                    );
                  } else { 
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={item.href === '/' ? pathname === '/' : (pathname === item.href || pathname.startsWith(item.href + '/'))}
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
              )}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-2 border-t">
             <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton
                        tooltip={{ children: "Global Settings", side: "right", className: "ml-2" }}
                        className="justify-start"
                        onClick={handleSidebarFooterSettingsClick}
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
            <div className="flex-1 flex items-center gap-3">
              {activeClientForDisplay?.logoUrl && !isAdminSection ? (
                  <Image
                    src={activeClientForDisplay.logoUrl}
                    alt={`${activeClientForDisplay.name} Logo`}
                    width={32} 
                    height={32}
                    className="h-8 w-8 object-contain rounded" 
                    data-ai-hint="client logo small"
                    unoptimized
                  />
              ) : !isAdminSection ? (
                  <Image
                    src="https://placehold.co/100x32.png" 
                    alt="RentPilot Logo Placeholder"
                    width={32}
                    height={32}
                    className="h-8 w-8 object-contain rounded"
                    data-ai-hint="app logo small"
                    unoptimized
                  />
              ) : null}
              <h1 className="text-xl font-semibold font-headline">
                {currentActivePageLabel}
                 {loggedInClient && !isAdminSection && !viewingClient && ` - ${loggedInClient.name}`}
                 {viewingClient && !isAdminSection && ` - ${viewingClient.name}`}
              </h1>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar>
                    <AvatarImage src="https://placehold.co/40x40.png" alt="User Avatar Placeholder" data-ai-hint="user avatar placeholder"/>
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

                <DropdownMenuItem onClick={() => router.push('/profile')}>
                    <UserCircle className="mr-2 h-4 w-4" />
                    Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleUserDropdownSettingsClick}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          {authUser?.isSuperAdmin && viewingClient && !isAdminSection && ( 
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
