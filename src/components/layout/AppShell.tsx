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
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  useSidebar, 
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { 
  Home, Users, CreditCard, BarChart3, Settings, LogOut, Building, ShieldAlert,
  LayoutDashboard, Cog, ArrowLeft, Eye, UsersRound, UserCog, Clock, ShieldCheck,
  ReceiptText, FileText, TrendingUp, UserCircle, AlertCircle, DatabaseBackup, MapPin,
  MessageSquare, ListPlus, CalendarCheck, Bell, Download, Megaphone, Monitor, PiggyBank,
  Handshake, Trash2, Ticket, Car, Key, Menu, X, Tags, MoreHorizontal
} from 'lucide-react'; 
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'; 
import { useAuth } from '@/contexts/AuthContext';
import { useAppContext } from '@/contexts/AppContext';
import type { AppSidebarNavItem, AppNavGroup, Announcement } from '@/lib/types'; 
import { cn } from '@/lib/utils';
import { startOfDay, formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AnnouncementViewerDialog } from './AnnouncementViewerDialog';
import { MAIN_APP_LOGO_URL } from '@/lib/branding';

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

const baseAppNavItems: Omit<AppSidebarNavItem, 'label'>[] = [
  { isGroup: false, href: '/', icon: Home },
  { isGroup: false, href: '/tenants', icon: Users },
  { isGroup: false, href: '/payments', icon: CreditCard },
  { isGroup: false, href: '/additional-dues', icon: ListPlus },
  { isGroup: false, href: '/monitoring', icon: BarChart3 },
  { isGroup: false, href: '/expenses', icon: ReceiptText },
  { isGroup: false, href: '/announcements', icon: Megaphone, clientAdminOnly: true },
  { isGroup: false, href: '/contracts', icon: FileText, clientAdminOnly: true },
  { isGroup: false, href: '/notifications', icon: Bell, clientAdminOnly: true },
  { isGroup: false, href: '/subscription', icon: ShieldCheck, clientOnly: true },
  {
    isGroup: true,
    icon: BarChart3,
    items: [
      { href: '/reports', label: 'Summary', icon: FileText },
      { href: '/reports/earnings', label: 'Earnings', icon: TrendingUp },
      { href: '/reports/payments', label: 'Payment Log', icon: CreditCard },
    ]
  },
  { isGroup: false, href: '/users', icon: UserCog, clientAdminOnly: true },
];

const tenantNavItems: Omit<AppSidebarNavItem, 'label'>[] = [
  { isGroup: false, href: '/', icon: LayoutDashboard },
  { isGroup: false, href: '/profile', icon: UserCircle },
];

const adminSidebarConfig: AdminSidebarConfigItem[] = [
  { isGroup: false, href: '/admin', label: 'Admin Dashboard', icon: LayoutDashboard },
  { isGroup: false, href: '/admin/clients', label: 'Clients', icon: Building },
  { isGroup: false, href: '/admin/users', label: 'All Client Users', icon: UsersRound },
  { isGroup: false, href: '/admin/subscriptions', label: 'Subscriptions', icon: BarChart3 },
  { isGroup: false, href: '/admin/announcements', label: 'Announcements', icon: Megaphone },
  { isGroup: false, href: '/admin/chat', label: 'Live Chat', icon: MessageSquare },
  { isGroup: false, href: '/admin/maintenance/demo-requests', label: 'Demo Requests', icon: CalendarCheck },
  {
    isGroup: true,
    groupLabel: 'System',
    groupIcon: Cog,
    items: [
      { href: '/admin/settings', label: 'Timezone Settings', icon: Clock },
      { href: '/admin/superadmin-users', label: 'Manage Super Admins', icon: ShieldCheck },
      { href: '/admin/maintenance/backups', label: 'Backups', icon: DatabaseBackup },
      { href: '/admin/maintenance/deleted-clients', label: 'Deleted Clients', icon: Trash2 },
    ]
  }
];

const GroupedAppNavItem = ({ item, pathname, disabled, onClick }: { item: AppNavGroup; pathname: string; disabled: boolean, onClick?: () => void }) => {
  const { state: sidebarState, isMobile: sidebarIsMobile } = useSidebar();
  const isIconCollapsed = sidebarState === 'collapsed' && !sidebarIsMobile;
  const isGroupActive = item.items.some(subItem => pathname === subItem.href || pathname.startsWith(subItem.href));
  const showTooltip = isIconCollapsed;

  const trigger = (
    <AccordionTrigger
      disabled={disabled}
      className={cn(
        "flex w-full items-center rounded-xl border border-transparent p-2.5 text-left text-sm font-medium outline-none ring-sidebar-ring transition-all duration-200 hover:-translate-y-[1px] hover:no-underline focus-visible:ring-2",
        "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground",
        isIconCollapsed && "!size-10 !p-2.5 justify-center",
        (isGroupActive && "data-[state=closed]:border-sidebar-border/80 data-[state=closed]:bg-white/75 data-[state=closed]:text-sidebar-primary"),
        "data-[state=open]:border-sidebar-border/80 data-[state=open]:bg-white/75 data-[state=open]:text-sidebar-primary"
      )}
    >
      <div className="flex flex-1 items-center gap-2">
        <item.icon className="h-[18px] w-[18px] shrink-0" />
        {!isIconCollapsed && <span className="truncate">{item.label}</span>}
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
      <AccordionContent className={cn(isIconCollapsed && "hidden")}>
        <div className="pt-1 pb-1 pl-[calc(theme(spacing.2)_+_theme(spacing.4))] space-y-1">
          {item.items.map(subItem => (
            <SidebarMenuItem key={subItem.href} className="p-0">
              <SidebarMenuButton
                asChild
                size="sm"
                isActive={pathname === subItem.href || pathname.startsWith(subItem.href)}
                className="justify-start w-full"
                disabled={disabled}
                onClick={onClick}
              >
                <Link href={subItem.href}>
                  <subItem.icon className="h-[18px] w-[18px]" />
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

function AppShellContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user: authUser, logout } = useAuth();
  const { viewingAsClientId, clients, setViewMode, tenants, announcements, markAnnouncementAsRead, terminology } = useAppContext();
  const { isMobile, openMobile, setOpenMobile, state: sidebarState } = useSidebar();
  const [subscriptionExpired, setSubscriptionExpired] = React.useState(false);
  const { toast } = useToast();

  const [installPrompt, setInstallPrompt] = React.useState<any>(null);
  const [viewingAnnouncement, setViewingAnnouncement] = React.useState<Announcement | null>(null);
  const [sidebarIconFailed, setSidebarIconFailed] = React.useState(false);
  const [clientLogoFailed, setClientLogoFailed] = React.useState(false);

  const handleMobileNavClick = () => {
    if (isMobile) {
        setOpenMobile(false);
    }
  };

  React.useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleDownloadApp = () => {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then((choiceResult: { outcome: string }) => {
        if (choiceResult.outcome === 'accepted') {
          toast({ title: 'App Installed!' });
        }
        setInstallPrompt(null);
      });
    } else {
        toast({
            title: "Installation",
            description: "Use your browser menu to 'Install' or 'Add to Home Screen'.",
        });
    }
    handleMobileNavClick();
  };

  const [filteredAnnouncements, setFilteredAnnouncements] = React.useState<Announcement[]>([]);
  
  React.useEffect(() => {
    if (!authUser || !announcements) {
      setFilteredAnnouncements([]);
      return;
    }
    
    let relevant: Announcement[] = [];
    if (authUser.isSuperAdmin) {
        // Super admins see global announcements if viewing a client
    } else if (authUser.role === 'admin' || authUser.role === 'user' || authUser.role === 'hub-admin' || authUser.role === 'technician') {
        relevant = announcements.filter(a => a.scope === 'global' && a.audience === 'client-admin' && !a.recipientId);
    } else if (authUser.role === 'tenant' && authUser.clientId && authUser.tenantId) {
        relevant = announcements.filter(a => 
            a.audience === 'tenant' &&
            a.scope === authUser.clientId &&
            (!a.recipientId || a.recipientId === authUser.tenantId)
        );
    }
    
    relevant.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setFilteredAnnouncements(relevant);
  }, [announcements, authUser]);

  const unreadCount = React.useMemo(() => {
    if (!authUser) return 0;
    return filteredAnnouncements.filter(a => !a.readBy.includes(authUser.username)).length;
  }, [filteredAnnouncements, authUser]);

  const handleAnnouncementClick = (announcement: Announcement) => {
    if (!authUser) return;
    setViewingAnnouncement(announcement);
    if (!announcement.readBy.includes(authUser.username)) {
      markAnnouncementAsRead(announcement.id, authUser.username);
    }
  };

  const isTenantSection = authUser?.role === 'tenant';
  const isSuperAdminViewingAsClient = !!authUser?.isSuperAdmin && !!viewingAsClientId;
  const isTrueAdminView = authUser?.isSuperAdmin && !isSuperAdminViewingAsClient && pathname.startsWith('/admin');

  let currentAppNavItems: AppSidebarNavItem[] = [];
  let currentAdminConfigItems: AdminSidebarConfigItem[] = [];
  let currentActivePageLabel = 'Rental Pilot';

  const viewingClient = viewingAsClientId ? clients.find(c => c.id === viewingAsClientId) : null;
  const loggedInClient = authUser?.clientId ? clients.find(c => c.id === authUser.clientId) : null;
  const activeClientForDisplay = viewingClient || loggedInClient;
  
  const currentTenant = React.useMemo(() => {
      if (authUser?.role !== 'tenant' || !authUser.tenantId) return null;
      return tenants.find(t => t.id === authUser.tenantId);
  }, [authUser, tenants]);

  React.useEffect(() => {
    setClientLogoFailed(false);
  }, [activeClientForDisplay?.logoUrl]);

  React.useEffect(() => {
    if (loggedInClient && !authUser?.isSuperAdmin) {
      if (loggedInClient.subscriptionStatus === 'inactive') {
        setSubscriptionExpired(true);
      } else if (loggedInClient.subscriptionEndDate) {
        const endDate = startOfDay(new Date(loggedInClient.subscriptionEndDate));
        const today = startOfDay(new Date());
        setSubscriptionExpired(today > endDate);
      } else {
        setSubscriptionExpired(false);
      }
    } else {
      setSubscriptionExpired(false);
    }
  }, [loggedInClient, authUser]);

  const appLabels = React.useMemo(() => {
    const { single, plural } = terminology;
    return {
        dashboard: 'Dashboard',
        tenants: plural,
        payments: 'Payments',
        additionalDues: 'Additional Dues',
        monitoring: 'Monitoring',
        expenses: 'Expenses',
        announcements: 'Announcements',
        notifications: 'Notifications',
        subscription: 'Subscription',
        reports: 'Reports',
        users: `Manage Users`,
        profile: 'My Profile',
        myDashboard: 'My Dashboard'
    };
  }, [terminology]);
  
  if (isTrueAdminView) {
      currentAdminConfigItems = adminSidebarConfig;
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
  } else {
      let baseNavItems: Omit<AppSidebarNavItem, 'label'>[];
      if(isTenantSection) {
        baseNavItems = [...tenantNavItems];
        if (activeClientForDisplay?.businessType === 'ISP_Subscription') {
            baseNavItems.push({ isGroup: false, href: '/request-support', icon: Ticket });
        }
        currentAppNavItems = baseNavItems.map(item => {
            let label = 'Item';
            if (item.href === '/') label = appLabels.myDashboard;
            if (item.href === '/profile') label = appLabels.profile;
            if (item.href === '/request-support') label = 'Request Support';
            return { ...item, label };
        });
      } else {
        const isHubAdmin = authUser?.role === 'hub-admin' && loggedInClient?.name === 'i-VirtuaTech';
        const isTechnician = authUser?.role === 'technician';
        
        if (isTechnician) {
            baseNavItems = []; 
        } else {
            baseNavItems = [...baseAppNavItems].filter(item => {
              if (isHubAdmin) {
                const allowedHubAdminRoutes = ['/', '/tenants', '/monitoring', '/expenses', '/announcements', '/notifications'];
                return !item.isGroup && allowedHubAdminRoutes.includes(item.href);
              }
              const isClientContext = (!authUser?.isSuperAdmin && !!authUser?.clientId) || isSuperAdminViewingAsClient;
              if (item.clientAdminOnly) {
                const isActuallyClientAdmin = (authUser?.role === 'admin') && !authUser.isSuperAdmin;
                return isActuallyClientAdmin || isSuperAdminViewingAsClient;
              }
              if (item.clientOnly) return isClientContext;
              if (item.superAdminOnly) return !!authUser?.isSuperAdmin && !isSuperAdminViewingAsClient;
              
              if (activeClientForDisplay?.businessType === 'Vehicle_Rental') {
                const hiddenItems = ['/payments', '/additional-dues', '/monitoring'];
                if (!item.isGroup && hiddenItems.includes(item.href)) return false;
              }
              return true;
            });
        }

        currentAppNavItems = baseNavItems.map(item => {
            if (item.isGroup) return { ...item, label: 'Reports' };
            let label = "Menu Item";
            let icon = item.icon;
            if(item.href === '/') label = appLabels.dashboard;
            if(item.href === '/tenants') {
                label = activeClientForDisplay?.businessType === 'Vehicle_Rental' ? 'Renters Data' : appLabels.tenants;
                if (activeClientForDisplay?.businessType === 'Vehicle_Rental') icon = Users;
            }
            if(item.href === '/payments') label = appLabels.payments;
            if(item.href === '/additional-dues') label = appLabels.additionalDues;
            if(item.href === '/monitoring') label = appLabels.monitoring;
            if(item.href === '/expenses') label = appLabels.expenses;
            if(item.href === '/announcements') label = appLabels.announcements;
            if(item.href === '/contracts') label = 'Contract Templates';
            if(item.href === '/notifications') label = appLabels.notifications;
            if(item.href === '/subscription') label = appLabels.subscription;
            if(item.href === '/users') label = appLabels.users;
            return { ...item, label, icon };
        });

        if (activeClientForDisplay?.businessType === 'Vehicle_Rental') {
            const bookingsItem: AppSidebarNavItem = { isGroup: false, href: '/bookings', label: 'Booking', icon: CalendarCheck };
            const vehiclesItem: AppSidebarNavItem = { isGroup: false, href: '/vehicles', label: 'Fleet Management', icon: Car };
            const categoriesItem: AppSidebarNavItem = { isGroup: false, href: '/vehicle-categories', label: 'Vehicle Categories', icon: Tags };
            const tenantsIndex = currentAppNavItems.findIndex(item => !item.isGroup && item.href === '/tenants');
            if (tenantsIndex !== -1) {
              currentAppNavItems.splice(tenantsIndex + 1, 0, bookingsItem, vehiclesItem, categoriesItem);
            } else {
              currentAppNavItems.push(bookingsItem, vehiclesItem, categoriesItem);
            }
        }

        if (activeClientForDisplay?.businessType === 'PC_Rental' || activeClientForDisplay?.businessType === 'ISP_Subscription') {
            const pcManagementItem: AppSidebarNavItem = { isGroup: false, href: '/pc-management', label: 'PC Management', icon: Monitor };
            const tenantsIndex = currentAppNavItems.findIndex(item => !item.isGroup && item.href === '/tenants');
            if (tenantsIndex !== -1) currentAppNavItems.splice(tenantsIndex + 1, 0, pcManagementItem);
            else currentAppNavItems.push(pcManagementItem);
        }

        if (activeClientForDisplay?.businessType === 'Standard' || activeClientForDisplay?.businessType === 'Vehicle_Rental') {
            if (activeClientForDisplay?.businessType !== 'Vehicle_Rental') {
                const roomManagementItem: AppSidebarNavItem = { isGroup: false, href: '/room-management', label: 'Room Management', icon: Home };
                const tenantsIndex = currentAppNavItems.findIndex(item => !item.isGroup && item.href === '/tenants');
                if (tenantsIndex !== -1) currentAppNavItems.splice(tenantsIndex + 1, 0, roomManagementItem);
                else currentAppNavItems.push(roomManagementItem);
            }
        }
        
        if (activeClientForDisplay?.businessType === 'ISP_Subscription') {
            const ticketSupportItem: AppSidebarNavItem = { isGroup: false, href: '/ticket-support', label: 'Ticket Support', icon: Ticket };
            if(isTechnician) currentAppNavItems.push(ticketSupportItem);
            else {
                const tenantsIndex = currentAppNavItems.findIndex(item => !item.isGroup && item.href === '/tenants');
                if (tenantsIndex !== -1) currentAppNavItems.splice(tenantsIndex + 1, 0, ticketSupportItem);
                else currentAppNavItems.push(ticketSupportItem);
            }
        }
        
        if (activeClientForDisplay?.name === 'i-VirtuaTech' && !isHubAdmin) {
           const partnerEarningsItem: AppSidebarNavItem = { isGroup: false, href: '/partner-earnings', label: 'Partner Earnings', icon: Handshake };
           const companyFundsItem: AppSidebarNavItem = { isGroup: false, href: '/company-funds', label: 'Company Funds', icon: PiggyBank };
           const expensesIndex = currentAppNavItems.findIndex(item => !item.isGroup && item.href === '/expenses');
           if (expensesIndex !== -1) currentAppNavItems.splice(expensesIndex + 1, 0, partnerEarningsItem, companyFundsItem);
           else currentAppNavItems.push(partnerEarningsItem, companyFundsItem);
        }
        
        if (activeClientForDisplay && activeClientForDisplay.name === "D' First Hub") {
            currentAppNavItems.push({ isGroup: false, href: '/tracking', label: 'Tracking', icon: MapPin });
        }
      }

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
          if ((item.href === '/' ? pathname === '/' : (pathname === item.href || pathname.startsWith(item.href + '/')))) {
             currentActivePageLabel = item.label;
             activeItemFound = true;
          }
        }
        if (activeItemFound) break;
      }
  }

  const handleReturnToAdminView = () => { setViewMode(null); router.push('/admin'); };
  const handleReturnToGlobalView = () => { setViewMode(null); router.push('/'); };
  const handleUserDropdownSettingsClick = () => router.push(authUser?.isSuperAdmin ? '/admin/settings' : '/settings');
  const handleSidebarFooterSettingsClick = () => { router.push('/profile'); handleMobileNavClick(); };

  const getAccountLabel = () => {
    if (authUser?.isSuperAdmin && !viewingClient) return `${authUser.username} (Super Admin)`;
    if (viewingClient) return `${authUser?.username} (Viewing as ${viewingClient.name})`;
    if (loggedInClient && !authUser?.isSuperAdmin) {
      if(authUser?.role === 'tenant') return `${authUser.username} (${terminology.single} at ${loggedInClient.name})`;
      const roleLabel = authUser.role === 'hub-admin' ? 'Hub Admin' : (authUser.role === 'technician' ? 'Technician' : (authUser.role ? authUser.role.charAt(0).toUpperCase() + authUser.role.slice(1) : 'User'));
      return `${authUser.username} (${roleLabel} at ${loggedInClient.name})`;
    }
    return authUser?.username || 'My Account';
  };

  const mobileToggleLabel = openMobile ? 'Close menu' : 'Open menu';
  const isIconCollapsed = sidebarState === 'collapsed' && !isMobile;
  const shouldUseClientLogo = !!activeClientForDisplay?.logoUrl && !isTrueAdminView && !clientLogoFailed;
  const headerLogoSrc = shouldUseClientLogo ? activeClientForDisplay!.logoUrl! : MAIN_APP_LOGO_URL;
  const headerLogoAlt = shouldUseClientLogo ? `${activeClientForDisplay?.name || 'Client'} logo` : 'Rental Pilot';
  const collapsedBrandSrc = shouldUseClientLogo ? headerLogoSrc : MAIN_APP_LOGO_URL;

  const isNavItemActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');

  const bottomNavSource: { href: string; label: string; icon: React.ElementType }[] = (
    isTrueAdminView
      ? currentAdminConfigItems.filter((i): i is AdminTopLevelNavItem => !i.isGroup)
      : (currentAppNavItems.filter((i) => !i.isGroup) as AppSidebarNavItem[])
  ).map((i) => ({ href: i.href, label: i.label, icon: i.icon }));

  const bottomNavItems = bottomNavSource.slice(0, 4);

  const isBottomNavDisabled = (href: string) =>
    subscriptionExpired &&
    !['/subscription', '/profile', '/settings', '/notifications', '/contracts'].includes(href);

  return (
    <>
      <div className="flex min-h-screen w-full">
        <Sidebar variant="inset" collapsible="icon" side="left">
          <SidebarHeader className="flex h-14 items-center justify-center border-b border-sidebar-border/60 px-2">
            <Link href="/" className="flex items-center justify-center" onClick={handleMobileNavClick}>
              {!isIconCollapsed ? (
                <Image
                  src={shouldUseClientLogo ? headerLogoSrc : MAIN_APP_LOGO_URL}
                  alt={headerLogoAlt}
                  width={160}
                  height={45}
                  className="h-9 w-auto max-w-[150px] object-contain"
                  onError={() => {
                    if (shouldUseClientLogo) setClientLogoFailed(true);
                  }}
                  unoptimized
                />
              ) : !sidebarIconFailed ? (
                <Image
                  src={collapsedBrandSrc}
                  alt={headerLogoAlt}
                  width={36}
                  height={36}
                  className="h-9 w-9 rounded-xl object-contain"
                  onError={() => setSidebarIconFailed(true)}
                  unoptimized
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-xs font-bold text-primary-foreground">
                  RP
                </div>
              )}
            </Link>
          </SidebarHeader>
          <SidebarContent className="flex-1 gap-1 px-2 py-3">
            <SidebarGroup className="p-0">
              {!isIconCollapsed && <SidebarGroupLabel className="px-2">Menu</SidebarGroupLabel>}
              <SidebarMenu>
                {isTrueAdminView ? (
                  currentAdminConfigItems.map((item, index) => {
                    if (item.isGroup) {
                      return (
                        <React.Fragment key={`admin-group-${item.groupLabel}-${index}`}>
                          {!isIconCollapsed && (
                            <div className="mt-3 flex items-center px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-sidebar-foreground/60">
                              <item.groupIcon className="h-[18px] w-[18px]" />
                              <span className="ml-2">{item.groupLabel}</span>
                            </div>
                          )}
                          {item.items.map(subItem => (
                            <SidebarMenuItem key={subItem.href}>
                              <SidebarMenuButton asChild isActive={pathname === subItem.href || pathname.startsWith(subItem.href)} tooltip={subItem.label} onClick={handleMobileNavClick}>
                                <Link href={subItem.href}>
                                  <subItem.icon className="h-[18px] w-[18px]" />
                                  {!isIconCollapsed && <span>{subItem.label}</span>}
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          ))}
                        </React.Fragment>
                      );
                    }
                    return (
                      <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))} tooltip={item.label} onClick={handleMobileNavClick}>
                          <Link href={item.href}>
                          <item.icon className="h-[18px] w-[18px]" />
                            {!isIconCollapsed && <span>{item.label}</span>}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })
                ) : ( 
                  currentAppNavItems.map((item) => {
                    if (item.isGroup) {
                      const isGroupActiveForAccordion = item.items.some(subItem => pathname === subItem.href || pathname.startsWith(subItem.href));
                      return (
                        <Accordion type="single" collapsible className="w-full" key={`app-group-${item.label}`} defaultValue={isGroupActiveForAccordion ? item.label : undefined}>
                          <GroupedAppNavItem item={item as AppNavGroup} pathname={pathname} disabled={subscriptionExpired} onClick={handleMobileNavClick} />
                        </Accordion>
                      );
                    }
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild isActive={item.href === '/' ? pathname === '/' : (pathname === item.href || pathname.startsWith(item.href + '/'))} tooltip={item.label} disabled={subscriptionExpired && !['/subscription', '/profile', '/settings', '/notifications', '/contracts'].includes(item.href)} onClick={handleMobileNavClick}>
                          <Link href={item.href === '/users' && authUser?.isSuperAdmin ? '/admin/users' : item.href}>
                            <item.icon className="h-[18px] w-[18px]" />
                            {!isIconCollapsed && <span>{item.label}</span>}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })
                )}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="p-3 border-t border-sidebar-border/70">
             <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Download App" onClick={handleDownloadApp}>
                        <Download className="h-5 w-5" />
                        {!isIconCollapsed && <span>Download App</span>}
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton tooltip="My Profile" onClick={handleSidebarFooterSettingsClick} disabled={subscriptionExpired && pathname !== '/subscription'}>
                        <UserCircle className="h-5 w-5" />
                        {!isIconCollapsed && <span>My Profile</span>}
                    </SidebarMenuButton>
                </SidebarMenuItem>
             </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex min-h-svh flex-1 flex-col bg-transparent overflow-x-clip max-md:h-svh max-md:max-h-svh max-md:overflow-hidden">
          <header
            className={cn(
              'z-50 flex h-14 shrink-0 items-center gap-2 border-b border-border/70 bg-card px-3 shadow-sm sm:gap-3 sm:px-4',
              'sticky top-0 supports-[backdrop-filter]:bg-card/95 supports-[backdrop-filter]:backdrop-blur-lg',
              'md:mx-4 md:mt-3 md:h-16 md:rounded-2xl md:border md:bg-card/85 md:backdrop-blur-lg'
            )}
          >
            <div className="flex shrink-0 items-center gap-1">
              <SidebarTrigger className="hidden h-9 w-9 shrink-0 rounded-xl border border-border/60 bg-background/80 md:inline-flex" />
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 md:hidden"
                onClick={() => setOpenMobile(!openMobile)}
                aria-label={mobileToggleLabel}
              >
                {openMobile ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
              {shouldUseClientLogo && (
                <Image
                  src={headerLogoSrc}
                  alt={headerLogoAlt}
                  width={120}
                  height={36}
                  className="hidden h-8 w-auto shrink-0 object-contain sm:block md:h-9"
                  onError={() => setClientLogoFailed(true)}
                  unoptimized
                />
              )}
              <h1 className="truncate text-base font-semibold tracking-tight font-headline sm:text-lg md:text-xl">
                {currentActivePageLabel}
                {activeClientForDisplay && !isTrueAdminView && (
                  <span className="ml-1.5 hidden font-normal text-muted-foreground md:inline">
                    · {activeClientForDisplay.name}
                  </span>
                )}
              </h1>
            </div>
            {!authUser?.isSuperAdmin && (
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="relative shrink-0 rounded-full">
                          <Bell className="h-5 w-5" />
                          {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive"></span></span>}
                      </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80 sm:w-96">
                      <DropdownMenuLabel className="flex justify-between items-center">Announcements <Badge variant="secondary">{unreadCount} unread</Badge></DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <ScrollArea className="h-64">
                          {filteredAnnouncements.length > 0 ? (
                              filteredAnnouncements.map((announcement) => (
                                  <DropdownMenuItem key={announcement.id} className="flex items-start gap-3 p-3 cursor-pointer" onSelect={(e) => { e.preventDefault(); handleAnnouncementClick(announcement); }}>
                                      {!announcement.readBy.includes(authUser?.username || '') && <div className="mt-1 h-2 w-2 rounded-full bg-primary flex-shrink-0" />}
                                      <div className={cn("flex-1 space-y-1", (announcement.readBy.includes(authUser?.username || '')) && "pl-5")}>
                                          <p className="text-sm font-medium leading-none">{announcement.title}</p>
                                          <p className="text-sm text-muted-foreground truncate">{announcement.content}</p>
                                          <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(announcement.createdAt), { addSuffix: true })} by {announcement.senderName}</p>
                                      </div>
                                  </DropdownMenuItem>
                              ))
                          ) : (
                              <div className="text-center text-sm text-muted-foreground py-10"><p>No new announcements.</p></div>
                          )}
                      </ScrollArea>
                  </DropdownMenuContent>
              </DropdownMenu>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0 rounded-full">
                  <Avatar className="h-8 w-8"><AvatarFallback><UserCircle className="h-5 w-5" /></AvatarFallback></Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{getAccountLabel()}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {authUser?.isSuperAdmin && (viewingAsClientId ? <DropdownMenuItem onClick={handleReturnToAdminView}><ShieldAlert className="mr-2 h-4 w-4" />Return to Admin View</DropdownMenuItem> : pathname.startsWith('/admin') ? <DropdownMenuItem onClick={handleReturnToGlobalView}><ArrowLeft className="mr-2 h-4 w-4" />Back to App</DropdownMenuItem> : <DropdownMenuItem onClick={() => router.push('/admin')}><ShieldAlert className="mr-2 h-4 w-4" />Go to Admin Dashboard</DropdownMenuItem>)}
                <DropdownMenuItem onClick={() => router.push('/profile')} disabled={subscriptionExpired && pathname !== '/subscription'}><UserCircle className="mr-2 h-4 w-4" />Profile</DropdownMenuItem>
                {authUser?.role !== 'tenant' && <DropdownMenuItem onClick={handleUserDropdownSettingsClick} disabled={subscriptionExpired && pathname !== '/subscription'}><Settings className="mr-2 h-4 w-4" />Settings</DropdownMenuItem>}
                {authUser?.role === 'tenant' && currentTenant?.signedContractUrl && <DropdownMenuItem asChild><a href={currentTenant.signedContractUrl} target="_blank" rel="noopener noreferrer"><FileText className="mr-2 h-4 w-4" /><span>View My Contract</span></a></DropdownMenuItem>}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}><LogOut className="mr-2 h-4 w-4" />Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          {authUser?.isSuperAdmin && viewingClient && !isTrueAdminView && ( 
            <div className="mx-3 mt-3 flex shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 px-6 py-2 text-sm text-primary shadow-sm md:mx-4">
              <Eye className="mr-2 h-4 w-4 text-primary" />
              You are currently viewing data for: <strong className="ml-1 font-semibold text-primary">{viewingClient.name}</strong>.
            </div>
          )}
          <main
            className={cn(
              'flex-1 min-h-0 overflow-y-auto overscroll-y-contain pb-4 md:overflow-visible md:pt-5',
              pathname !== '/monitoring' &&
                !pathname.startsWith('/contract/sign') &&
                !pathname.startsWith('/partner-earnings') &&
                'p-3 pt-4 md:p-4'
            )}
          >
            {subscriptionExpired && !['/subscription', '/profile', '/settings', '/notifications', '/contracts'].includes(pathname) ? (
              <div className="flex h-full items-center justify-center">
                <Card className="w-full max-w-lg text-center shadow-2xl">
                  <CardHeader>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/20"><AlertCircle className="h-8 w-8 text-destructive" /></div>
                    <CardTitle className="mt-4 text-2xl text-destructive font-headline">Subscription Expired</CardTitle>
                    <CardDescription>Your organization's subscription has ended.</CardDescription>
                  </CardHeader>
                  <CardContent><p className="text-muted-foreground">Please go to the <Link href="/subscription" className="font-semibold text-primary underline">Subscription</Link> page to renew.</p></CardContent>
                </Card>
              </div>
            ) : (
              children
            )}
          </main>

          {/* Mobile bottom navigation */}
          <nav
            className="z-50 shrink-0 border-t border-border/70 bg-card/95 backdrop-blur-lg supports-[backdrop-filter]:bg-card/80 md:hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            aria-label="Primary"
          >
            <div className="flex items-stretch justify-around">
              {bottomNavItems.map((item) => {
                const active = isNavItemActive(item.href);
                const disabled = isBottomNavDisabled(item.href);
                const href = item.href === '/users' && authUser?.isSuperAdmin ? '/admin/users' : item.href;
                return (
                  <Link
                    key={item.href}
                    href={disabled ? '#' : href}
                    aria-disabled={disabled}
                    aria-current={active ? 'page' : undefined}
                    onClick={(e) => {
                      if (disabled) {
                        e.preventDefault();
                        return;
                      }
                      handleMobileNavClick();
                    }}
                    className={cn(
                      'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                      active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                      disabled && 'pointer-events-none opacity-40'
                    )}
                  >
                    <item.icon className={cn('h-5 w-5 shrink-0', active && 'stroke-[2.25]')} />
                    <span className="max-w-full truncate">{item.label}</span>
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={() => setOpenMobile(true)}
                aria-label="More menu"
                className={cn(
                  'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                  openMobile ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <MoreHorizontal className="h-5 w-5 shrink-0" />
                <span>More</span>
              </button>
            </div>
          </nav>
        </SidebarInset>
      </div>
      <AnnouncementViewerDialog isOpen={!!viewingAnnouncement} onClose={() => setViewingAnnouncement(null)} announcement={viewingAnnouncement} />
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
    return (
        <SidebarProvider defaultOpen>
            <AppShellContent>{children}</AppShellContent>
        </SidebarProvider>
    )
}
