
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
import { Home, Users, CreditCard, BarChart3, Settings, LogOut, Building, ShieldAlert, LayoutDashboard, Cog, ArrowLeft, Eye, UsersRound, UserCog, Clock, ShieldCheck, ImageOff, ReceiptText, FileText, TrendingUp, UserCircle, AlertCircle, Award, Wrench, DatabaseBackup, MapPin, BellRing, MessageSquare, ListPlus, CalendarCheck, Bell, Check, Download, Megaphone, Monitor, PiggyBank, Handshake, Trash2, Ticket } from 'lucide-react'; 
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'; 
import { useAuth } from '@/contexts/AuthContext';
import { useAppContext } from '@/contexts/AppContext';
import type { AppSidebarNavItem, AppNavGroup, Announcement } from '@/lib/types'; 
import { cn } from '@/lib/utils';
import { startOfDay, formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AnnouncementViewerDialog } from './AnnouncementViewerDialog';


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
  { isGroup: false, href: '/monitoring', icon: BellRing },
  { isGroup: false, href: '/expenses', icon: ReceiptText },
  { isGroup: false, href: '/announcements', icon: Megaphone, clientAdminOnly: true },
  { isGroup: false, href: '/notifications', icon: Bell, clientAdminOnly: true },
  { isGroup: false, href: '/subscription', icon: Award, clientOnly: true },
  {
    isGroup: true,
    icon: BarChart3,
    items: [
      { href: '/reports', label: 'Financial Summary', icon: FileText },
      { href: '/reports/earnings', label: 'Earnings Report', icon: TrendingUp },
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
  { isGroup: false, href: '/admin/subscriptions', label: 'Subscriptions', icon: Award },
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

const MAIN_APP_LOGO_URL = "https://firebasestorage.googleapis.com/v0/b/tenanttracker-u4wuw.firebasestorage.app/o/Whisk_storyboard1c1ee4a7bebe492d87191d51%20(1).png?alt=media";
const MAIN_APP_FAVICON_URL = "https://firebasestorage.googleapis.com/v0/b/tenanttracker-u4wuw.appspot.com/o/Whisk_storyboard1c1ee4a7bebe492d87191d51%20(2).png?alt=media&token=d8fdb3e6-1585-46ef-bd7a-a631f6b78299";

// Helper component for grouped app navigation items
const GroupedAppNavItem = ({ item, pathname, disabled, onClick }: { item: AppNavGroup; pathname: string; disabled: boolean, onClick?: () => void }) => {
  const { state: sidebarState, isMobile: sidebarIsMobile } = useSidebar();
  const isGroupActive = item.items.some(subItem => pathname === subItem.href || pathname.startsWith(subItem.href));
  const showTooltip = sidebarState === 'collapsed' && !sidebarIsMobile;

  const trigger = (
    <AccordionTrigger
      disabled={disabled}
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
                disabled={disabled}
                onClick={onClick}
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

function AppShellContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user: authUser, logout } = useAuth();
  const { viewingAsClientId, clients, setViewMode, tenants, announcements, markAnnouncementAsRead, terminology } = useAppContext();
  const { isMobile, setOpenMobile } = useSidebar();
  const [subscriptionExpired, setSubscriptionExpired] = React.useState(false);
  const { toast } = useToast();

  const [installPrompt, setInstallPrompt] = React.useState<any>(null);
  const [viewingAnnouncement, setViewingAnnouncement] = React.useState<Announcement | null>(null);

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
          toast({ title: 'App Installed!', description: 'RentPilot has been added to your home screen.' });
        } else {
          toast({ title: 'Installation Cancelled', description: 'You can install the app later from the menu.' });
        }
        setInstallPrompt(null);
      });
    } else {
        toast({
            title: "Manual Installation",
            description: "To install, use your browser's 'Add to Home Screen' or 'Install App' option from the menu.",
            duration: 9000,
        });
    }
    handleMobileNavClick();
  };

  // Announcement logic
  const [filteredAnnouncements, setFilteredAnnouncements] = React.useState<Announcement[]>([]);
  
  React.useEffect(() => {
    if (!authUser || !announcements) {
      setFilteredAnnouncements([]);
      return;
    }
    
    let relevant: Announcement[] = [];
    if (authUser.isSuperAdmin) {
        // Super admins do not see announcements in their bell. They manage them from their page.
    } else if (authUser.role === 'admin' || authUser.role === 'user' || authUser.role === 'hub-admin') {
        // Client admins only see global announcements, not targeted ones.
        relevant = announcements.filter(a => a.scope === 'global' && a.audience === 'client-admin' && !a.recipientId);
    } else if (authUser.role === 'tenant' && authUser.clientId && authUser.tenantId) {
        // Tenants see broadcasts for their client AND messages sent directly to them.
        relevant = announcements.filter(a => 
            a.audience === 'tenant' &&
            a.scope === authUser.clientId &&
            (
                !a.recipientId || // It's a broadcast for their client
                a.recipientId === authUser.tenantId // OR it's a message specifically for them
            )
        );
    }
    
    // Sort all relevant announcements by date
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
    // Mark as read when clicked, if it's unread
    if (!announcement.readBy.includes(authUser.username)) {
      markAnnouncementAsRead(announcement.id, authUser.username);
    }
  };


  const isTenantSection = authUser?.role === 'tenant';
  const isSuperAdminViewingAsClient = !!authUser?.isSuperAdmin && !!viewingAsClientId;
  const isTrueAdminView = authUser?.isSuperAdmin && !isSuperAdminViewingAsClient && pathname.startsWith('/admin');

  let currentAppNavItems: AppSidebarNavItem[] = [];
  let currentAdminConfigItems: AdminSidebarConfigItem[] = [];
  let currentActivePageLabel = 'RentPilot';

  const viewingClient = viewingAsClientId ? clients.find(c => c.id === viewingAsClientId) : null;
  const loggedInClient = authUser?.clientId ? clients.find(c => c.id === authUser.clientId) : null;
  const activeClientForDisplay = viewingClient || loggedInClient;
  
  const currentTenant = React.useMemo(() => {
      if (authUser?.role !== 'tenant' || !authUser.tenantId) return null;
      return tenants.find(t => t.id === authUser.tenantId);
  }, [authUser, tenants]);

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
      if (!activeItemFound && pathname === '/admin') currentActivePageLabel = 'Admin Dashboard';
      else if (!activeItemFound && pathname === '/admin/chat') currentActivePageLabel = 'Live Chat';
      else if (!activeItemFound && pathname === '/admin/announcements') currentActivePageLabel = 'Announcements';
      else if (!activeItemFound && pathname === '/admin/subscriptions') currentActivePageLabel = 'Subscriptions';
      else if (!activeItemFound && pathname === '/admin/contracts') currentActivePageLabel = 'Contract Templates';
      else if (!activeItemFound && pathname === '/admin/settings') currentActivePageLabel = 'Timezone Settings';
      else if (!activeItemFound && pathname === '/admin/superadmin-users') currentActivePageLabel = 'Manage Super Admins';
      else if (!activeItemFound && pathname === '/admin/maintenance/backups') currentActivePageLabel = 'Backups';
      else if (!activeItemFound && pathname === '/admin/maintenance/deleted-clients') currentActivePageLabel = 'Deleted Clients';
      else if (!activeItemFound && pathname === '/admin/maintenance/demo-requests') currentActivePageLabel = 'Demo Requests';
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
        
        baseNavItems = [...baseAppNavItems].filter(item => {
          if (isHubAdmin) {
            const allowedHubAdminRoutes = ['/', '/tenants', '/pc-management', '/monitoring', '/expenses', '/announcements', '/notifications'];
            return !item.isGroup && allowedHubAdminRoutes.includes(item.href);
          }

          const isClientContext = (!authUser?.isSuperAdmin && !!authUser?.clientId) || isSuperAdminViewingAsClient;

          if (item.clientAdminOnly) {
            const isActuallyClientAdmin = (authUser?.role === 'admin') && !authUser.isSuperAdmin;
            return isActuallyClientAdmin || isSuperAdminViewingAsClient;
          }
          if (item.clientOnly) {
            return isClientContext;
          }
          if (item.superAdminOnly) { 
              return !!authUser?.isSuperAdmin && !isSuperAdminViewingAsClient;
          }
          return true;
        });

        currentAppNavItems = baseNavItems.map(item => {
            if (item.isGroup) {
                return { ...item, label: 'Reports' };
            }
            let label = "Menu Item";
            if(item.href === '/') label = appLabels.dashboard;
            if(item.href === '/tenants') label = appLabels.tenants;
            if(item.href === '/payments') label = appLabels.payments;
            if(item.href === '/additional-dues') label = appLabels.additionalDues;
            if(item.href === '/monitoring') label = appLabels.monitoring;
            if(item.href === '/expenses') label = appLabels.expenses;
            if(item.href === '/announcements') label = appLabels.announcements;
            if(item.href === '/notifications') label = appLabels.notifications;
            if(item.href === '/subscription') label = appLabels.subscription;
            if(item.href === '/users') label = appLabels.users;
            
            return { ...item, label };
        });

        if (activeClientForDisplay?.businessType === 'PC_Rental') {
            const pcManagementItem: AppSidebarNavItem = {
                isGroup: false, href: '/pc-management', label: 'PC Management', icon: Monitor,
            };
            const tenantsIndex = currentAppNavItems.findIndex(item => !item.isGroup && item.href === '/tenants');
            if (tenantsIndex !== -1) {
                currentAppNavItems.splice(tenantsIndex + 1, 0, pcManagementItem);
            } else {
                currentAppNavItems.push(pcManagementItem);
            }
        }
        
        if (activeClientForDisplay?.businessType === 'ISP_Subscription') {
            const ticketSupportItem: AppSidebarNavItem = {
                isGroup: false, href: '/ticket-support', label: 'Ticket Support', icon: Ticket,
            };
             const tenantsIndex = currentAppNavItems.findIndex(item => !item.isGroup && item.href === '/tenants');
            if (tenantsIndex !== -1) {
                currentAppNavItems.splice(tenantsIndex + 1, 0, ticketSupportItem);
            } else {
                currentAppNavItems.push(ticketSupportItem);
            }
        }
        
        if (activeClientForDisplay?.name === 'i-VirtuaTech' && !isHubAdmin) {
           const partnerEarningsItem: AppSidebarNavItem = {
                isGroup: false, href: '/partner-earnings', label: 'Partner Earnings', icon: Handshake,
            };
            const companyFundsItem: AppSidebarNavItem = {
                isGroup: false, href: '/company-funds', label: 'Company Funds', icon: PiggyBank,
            };
            const expensesIndex = currentAppNavItems.findIndex(item => !item.isGroup && item.href === '/expenses');
            if (expensesIndex !== -1) {
                currentAppNavItems.splice(expensesIndex + 1, 0, partnerEarningsItem, companyFundsItem);
            } else {
                currentAppNavItems.push(partnerEarningsItem, companyFundsItem);
            }
        }
        
        if (activeClientForDisplay && activeClientForDisplay.name === "D' First Hub") {
            const trackingItem: AppSidebarNavItem = {
                isGroup: false,
                href: '/tracking',
                label: 'Tracking',
                icon: MapPin,
            };
            currentAppNavItems.push(trackingItem);
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
       if (!activeItemFound && pathname === '/profile') currentActivePageLabel = 'User Profile';
       else if (!activeItemFound && pathname === '/settings') currentActivePageLabel = 'Account Settings';
       else if (!activeItemFound && pathname === '/announcements') currentActivePageLabel = 'Announcements';
       else if (!activeItemFound && pathname === '/notifications') currentActivePageLabel = 'Notifications';
       else if (!activeItemFound && pathname === '/subscription') currentActivePageLabel = 'Subscription & Billing';
       else if (!activeItemFound && pathname.startsWith('/contract/sign')) currentActivePageLabel = 'Sign Contract';
       else if (!activeItemFound) currentActivePageLabel = 'RentPilot'; 
  }

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
    router.push('/profile');
    handleMobileNavClick();
  };

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

  return (
    <>
      <div className="flex min-h-screen w-full">
        <Sidebar variant="sidebar" collapsible="icon" side="left" className="border-r">
          <SidebarHeader className="p-4 flex items-center justify-center">
            <Link href="/" className="flex items-center justify-center" onClick={handleMobileNavClick}>
                {/* Expanded Logo */}
                <Image 
                  src={MAIN_APP_LOGO_URL}
                  alt="RentPilot app logo" 
                  width={160} 
                  height={45}
                  className="object-contain group-data-[collapsible=icon]:hidden"
                  data-ai-hint="app logo"
                  unoptimized
                />
                {/* Collapsed Icon */}
                <Image 
                  src={MAIN_APP_FAVICON_URL}
                  alt="RentPilot icon" 
                  width={32}
                  height={32}
                  className="object-contain hidden group-data-[collapsible=icon]:block"
                  data-ai-hint="app icon"
                  unoptimized
                />
            </Link>
          </SidebarHeader>
          <SidebarContent className="flex-1 p-2">
            <SidebarMenu>
              {isTrueAdminView ? (
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
                              onClick={handleMobileNavClick}
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
                          onClick={handleMobileNavClick}
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
                currentAppNavItems.map((item) => {
                  if (item.isGroup) {
                    const isGroupActiveForAccordion = item.items.some(subItem => pathname === subItem.href || pathname.startsWith(subItem.href));
                    return (
                       <Accordion type="single" collapsible className="w-full" key={`app-group-${item.label}`} defaultValue={isGroupActiveForAccordion ? item.label : undefined}>
                        <GroupedAppNavItem item={item as AppNavGroup} pathname={pathname} disabled={subscriptionExpired} onClick={handleMobileNavClick} />
                      </Accordion>
                    );
                  } else {
                    let finalHref = item.href;
                    if (item.href === '/users' && authUser?.isSuperAdmin) {
                        finalHref = '/admin/users';
                    }
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={item.href === '/' ? pathname === '/' : (pathname === item.href || pathname.startsWith(item.href + '/'))}
                          tooltip={{ children: item.label, side: "right", className: "ml-2" }}
                          className="justify-start"
                          disabled={subscriptionExpired && !['/subscription', '/monitoring', '/profile', '/announcements', '/notifications'].includes(item.href)}
                          onClick={handleMobileNavClick}
                        >
                          <Link href={finalHref}>
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
                        tooltip={{ children: "Download App", side: "right", className: "ml-2" }}
                        className="justify-start"
                        onClick={handleDownloadApp}
                        >
                        <Download className="h-5 w-5" />
                        <span className="group-data-[collapsible=icon]:hidden">Download App</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton
                        tooltip={{ children: "My Profile", side: "right", className: "ml-2" }}
                        className="justify-start"
                        onClick={handleSidebarFooterSettingsClick}
                        disabled={subscriptionExpired && pathname !== '/subscription'}
                        >
                        <UserCircle className="h-5 w-5" />
                        <span className="group-data-[collapsible=icon]:hidden">My Profile</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
             </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1 flex flex-col bg-background">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-card px-6 shadow-sm">
            <SidebarTrigger className="md:hidden" />
            <div className="flex-1 flex items-center gap-3">
              {(() => {
                if (isTrueAdminView) {
                  return (
                    <Image
                      src={MAIN_APP_LOGO_URL}
                      alt="RentPilot app logo"
                      width={160}
                      height={45}
                      className="h-12 w-auto object-contain"
                      data-ai-hint="app logo small"
                      unoptimized
                    />
                  );
                }
                if (activeClientForDisplay?.logoUrl) {
                  return (
                    <Image
                      src={activeClientForDisplay.logoUrl}
                      alt={`${activeClientForDisplay.name} Logo`}
                      width={160}
                      height={45}
                      className="h-12 w-auto object-contain rounded"
                      data-ai-hint="client logo small"
                      unoptimized
                    />
                  );
                }
                // Global view
                return (
                  <Image
                    src={MAIN_APP_LOGO_URL}
                    alt="RentPilot app logo"
                    width={160}
                    height={45}
                    className="h-12 w-auto object-contain"
                    data-ai-hint="app logo small"
                    unoptimized
                  />
                );
              })()}
              <h1 className="text-xl font-semibold font-headline">
                {currentActivePageLabel}
                 {loggedInClient && !isTrueAdminView && !viewingClient && ` - ${loggedInClient.name}`}
                 {viewingClient && !isTrueAdminView && ` - ${viewingClient.name}`}
              </h1>
            </div>
            {!authUser?.isSuperAdmin && (
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="relative rounded-full">
                          <Bell className="h-5 w-5" />
                          {unreadCount > 0 && (
                              <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive"></span>
                              </span>
                          )}
                          <span className="sr-only">View notifications</span>
                      </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80 sm:w-96">
                      <DropdownMenuLabel className="flex justify-between items-center">
                          Announcements
                          <Badge variant="secondary">{unreadCount} unread</Badge>
                      </DropdownMenuLabel>
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
                              <div className="text-center text-sm text-muted-foreground py-10">
                                  <p>No new announcements.</p>
                              </div>
                          )}
                      </ScrollArea>
                  </DropdownMenuContent>
              </DropdownMenu>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar>
                    <AvatarFallback>
                      <UserCircle className="h-6 w-6" />
                    </AvatarFallback>
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

                {authUser?.isSuperAdmin && !viewingAsClientId && !pathname.startsWith('/admin') && (
                  <DropdownMenuItem onClick={() => router.push('/admin')}>
                    <ShieldAlert className="mr-2 h-4 w-4" />
                    Go to Admin Dashboard
                  </DropdownMenuItem>
                )}

                {authUser?.isSuperAdmin && !viewingAsClientId && pathname.startsWith('/admin') && (
                  <DropdownMenuItem onClick={handleReturnToGlobalView}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to App (Global View)
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem onClick={() => router.push('/profile')} disabled={subscriptionExpired && pathname !== '/subscription'}>
                    <UserCircle className="mr-2 h-4 w-4" />
                    Profile
                </DropdownMenuItem>
                {authUser?.role !== 'tenant' && (
                    <DropdownMenuItem onClick={handleUserDropdownSettingsClick} disabled={subscriptionExpired && pathname !== '/subscription'}>
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                    </DropdownMenuItem>
                )}
                {authUser?.role === 'tenant' && currentTenant?.signedContractUrl && (
                  <DropdownMenuItem asChild>
                    <a href={currentTenant.signedContractUrl} target="_blank" rel="noopener noreferrer">
                      <FileViewIcon className="mr-2 h-4 w-4" />
                      <span>View My Contract</span>
                    </a>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          {authUser?.isSuperAdmin && viewingClient && !isTrueAdminView && ( 
            <div className="bg-primary/10 text-primary-foreground py-2 px-6 text-sm flex items-center justify-center shadow">
              <Eye className="mr-2 h-4 w-4 text-primary" />
              You are currently viewing data for: <strong className="ml-1 font-semibold text-primary">{viewingClient.name}</strong>.
            </div>
          )}
          <main className={cn("flex-1 overflow-y-auto", pathname !== '/monitoring' && !pathname.startsWith('/contract/sign') && !pathname.startsWith('/partner-earnings') && 'p-6')}>
            {subscriptionExpired && !['/subscription', '/profile', '/settings', '/notifications'].includes(pathname) ? (
              <div className="flex h-full items-center justify-center">
                <Card className="w-full max-w-lg text-center shadow-2xl">
                  <CardHeader>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/20">
                        <AlertCircle className="h-8 w-8 text-destructive" />
                    </div>
                    <CardTitle className="mt-4 text-2xl text-destructive font-headline">Subscription Expired</CardTitle>
                    <CardDescription>
                        Your organization's subscription has ended. Access to most features has been disabled.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                      <p className="text-muted-foreground">
                          Please go to the <Link href="/subscription" className="font-semibold text-primary underline">Subscription</Link> page to renew your plan, or contact your administrator.
                      </p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              children
            )}
          </main>
        </SidebarInset>
      </div>
      <AnnouncementViewerDialog
        isOpen={!!viewingAnnouncement}
        onClose={() => setViewingAnnouncement(null)}
        announcement={viewingAnnouncement}
      />
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
