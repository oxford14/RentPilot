"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAppContext } from '@/contexts/AppContext';
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { DashboardChartCard } from '@/components/dashboard/DashboardChartCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  Cog,
  LayoutDashboard,
  Award,
  MessageSquare,
  UserCog,
  Megaphone,
  CalendarClock,
  ArrowRight,
} from 'lucide-react';
import { getClientSubscriptionStatus } from '@/lib/subscription-status';
import { ChartContainer, ChartTooltipContent, ChartLegendContent, type ChartConfig } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts';
import { format, subMonths, startOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';

const subscriptionChartConfig = {
  Active: { label: 'Active', color: 'hsl(var(--chart-2))' },
  'Expiring Soon': { label: 'Expiring Soon', color: 'hsl(var(--chart-3))' },
  Expired: { label: 'Expired', color: 'hsl(var(--chart-4))' },
  Inactive: { label: 'Inactive', color: 'hsl(var(--muted-foreground))' },
} satisfies ChartConfig;

const demoChartConfig = {
  requests: { label: 'Demo Requests', color: 'hsl(var(--chart-1))' },
} satisfies ChartConfig;

const quickLinks = [
  { href: '/admin/clients', label: 'Client Organizations', desc: 'View, add, or edit client accounts.', icon: Users, accent: 'border-blue-200 bg-blue-50/80 hover:border-blue-300' },
  { href: '/admin/subscriptions', label: 'Subscriptions', desc: 'Manage plans and renewal dates.', icon: Award, accent: 'border-emerald-200 bg-emerald-50/80 hover:border-emerald-300' },
  { href: '/admin/maintenance/demo-requests', label: 'Demo Requests', desc: 'Review and confirm booking requests.', icon: CalendarClock, accent: 'border-amber-200 bg-amber-50/80 hover:border-amber-300' },
  { href: '/admin/announcements', label: 'Announcements', desc: 'Broadcast updates to all clients.', icon: Megaphone, accent: 'border-violet-200 bg-violet-50/80 hover:border-violet-300' },
  { href: '/admin/chat', label: 'Live Chat', desc: 'Respond to visitor support sessions.', icon: MessageSquare, accent: 'border-cyan-200 bg-cyan-50/80 hover:border-cyan-300' },
  { href: '/admin/settings', label: 'System Settings', desc: 'Timezone and platform configuration.', icon: Cog, accent: 'border-slate-200 bg-slate-50/80 hover:border-slate-300' },
];

export default function AdminDashboardPage() {
  const { clients, rawDemoRequests, rawManagedUsers } = useAppContext();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  const subscriptionStats = useMemo(() => {
    const counts: Record<string, number> = { Active: 0, 'Expiring Soon': 0, Expired: 0, Inactive: 0 };
    clients.forEach((c) => {
      const status = getClientSubscriptionStatus(c);
      counts[status] = (counts[status] ?? 0) + 1;
    });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value, fill: `var(--color-${name.replace(/\s/g, '')})` }));
  }, [clients]);

  const demoMonthlyData = useMemo(() => {
    const months: { name: string; requests: number; sortKey: string }[] = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = startOfMonth(subMonths(today, i));
      months.push({
        name: format(d, "MMM ''yy"),
        requests: 0,
        sortKey: format(d, 'yyyy-MM'),
      });
    }
    rawDemoRequests.forEach((req) => {
      const key = format(new Date(req.createdAt), 'yyyy-MM');
      const bucket = months.find((m) => m.sortKey === key);
      if (bucket) bucket.requests += 1;
    });
    return months.map(({ name, requests }) => ({ name, requests }));
  }, [rawDemoRequests]);

  const activeCount = subscriptionStats.find((s) => s.name === 'Active')?.value ?? 0;
  const pendingDemos = rawDemoRequests.filter((r) => r.status === 'pending').length;
  const expiringSoon = subscriptionStats.find((s) => s.name === 'Expiring Soon')?.value ?? 0;

  const pieColors: Record<string, string> = {
    Active: 'hsl(var(--chart-2))',
    'Expiring Soon': 'hsl(var(--chart-3))',
    Expired: 'hsl(var(--chart-4))',
    Inactive: 'hsl(var(--muted-foreground))',
  };

  return (
    <div className="container mx-auto space-y-8 py-2">
      <DashboardPageHeader
        title="Admin Dashboard"
        subtitle="Super admin overview — clients, subscriptions, and platform health at a glance."
        icon={LayoutDashboard}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          label="Total Clients"
          value={clients.length}
          description="Registered organizations on the platform"
          icon={Users}
          variant="blue"
          href="/admin/clients"
          actionLabel="Manage Clients"
          staggerIndex={0}
          ready={ready}
        />
        <DashboardStatCard
          label="Active Subscriptions"
          value={activeCount}
          description="Clients with valid subscription access"
          icon={Award}
          variant="emerald"
          href="/admin/subscriptions"
          actionLabel="View Subscriptions"
          staggerIndex={1}
          ready={ready}
        />
        <DashboardStatCard
          label="Pending Demos"
          value={pendingDemos}
          description="Demo bookings awaiting confirmation"
          icon={CalendarClock}
          variant="amber"
          href="/admin/maintenance/demo-requests"
          actionLabel="Review Demos"
          staggerIndex={2}
          ready={ready}
        />
        <DashboardStatCard
          label="Platform Users"
          value={rawManagedUsers.length}
          description="Managed users across all clients"
          icon={UserCog}
          variant="violet"
          href="/admin/users"
          actionLabel="All Client Users"
          staggerIndex={3}
          ready={ready}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardChartCard
          title="Subscription Health"
          description={`${expiringSoon} client${expiringSoon === 1 ? '' : 's'} expiring within 3 days`}
          icon={Award}
          staggerIndex={0}
        >
          {ready && subscriptionStats.length > 0 ? (
            <ChartContainer config={subscriptionChartConfig} className="mx-auto min-h-[280px] w-full max-w-sm">
              <PieChart>
                <ChartTooltipContent hideLabel />
                <Pie
                  data={subscriptionStats}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  strokeWidth={2}
                  stroke="hsl(var(--card))"
                >
                  {subscriptionStats.map((entry) => (
                    <Cell key={entry.name} fill={pieColors[entry.name] ?? 'hsl(var(--chart-1))'} />
                  ))}
                </Pie>
                <ChartLegendContent />
              </PieChart>
            </ChartContainer>
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">No client data yet.</p>
          )}
        </DashboardChartCard>

        <DashboardChartCard
          title="Demo Requests (6 months)"
          description="New demo bookings over time"
          icon={CalendarClock}
          staggerIndex={1}
        >
          {ready ? (
            <ChartContainer config={demoChartConfig} className="min-h-[280px] w-full">
              <BarChart data={demoMonthlyData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                <ChartTooltipContent />
                <Bar dataKey="requests" fill="var(--color-requests)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">Loading chart…</p>
          )}
        </DashboardChartCard>
      </div>

      <div
        className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both duration-700"
        style={{ animationDelay: '450ms' }}
      >
        <h2 className="mb-4 text-lg font-semibold font-headline">Quick Access</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card
                className={cn(
                  'h-full cursor-pointer border-2 transition-all duration-300',
                  'hover:-translate-y-0.5 hover:shadow-md',
                  link.accent
                )}
              >
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-headline">{link.label}</CardTitle>
                  <link.icon className="h-5 w-5 text-primary transition-transform duration-300 group-hover:scale-110" />
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{link.desc}</p>
                  <span className="mt-3 inline-flex items-center text-sm font-medium text-primary">
                    Open <ArrowRight className="ml-1 h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
