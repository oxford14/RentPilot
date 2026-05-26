"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAppContext } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { Users, CreditCard, AlertTriangle, DollarSign, BarChart3, Loader2, LayoutDashboard, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TenantDashboard } from '@/components/tenants/TenantDashboard';
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { DashboardChartCard } from '@/components/dashboard/DashboardChartCard';
import { ChartContainer, ChartTooltipContent, ChartLegendContent, type ChartConfig } from '@/components/ui/chart';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts';
import { format, subMonths, startOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';

const paymentsChartConfig = {
  payments: { label: 'Collections', color: 'hsl(var(--chart-1))' },
} satisfies ChartConfig;

const tenantChartConfig = {
  active: { label: 'Active', color: 'hsl(var(--chart-2))' },
  inactive: { label: 'Inactive', color: 'hsl(var(--muted-foreground))' },
  atRisk: { label: 'At Risk', color: 'hsl(var(--chart-4))' },
} satisfies ChartConfig;

function AdminClientDashboard() {
  const { tenants, payments, terminology } = useAppContext();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  const activeTenantsCount = useMemo(
    () => tenants.filter((t) => t.status === 'active').length,
    [tenants]
  );

  const currentMonthPaymentsTotal = useMemo(() => {
    const today = new Date();
    return payments
      .filter((p) => {
        const paymentDate = new Date(p.date);
        return paymentDate.getMonth() === today.getMonth() && paymentDate.getFullYear() === today.getFullYear();
      })
      .reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);

  const delinquentTenantsCount = useMemo(() => {
    const today = new Date();
    return tenants.filter((tenant) => {
      if (tenant.status === 'inactive') return false;
      const tenantPayments = payments.filter((p) => p.tenantId === tenant.id);
      const lastPayment = tenantPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      if (!lastPayment) return true;
      const daysSinceLastPayment = (today.getTime() - new Date(lastPayment.date).getTime()) / (1000 * 3600 * 24);
      return daysSinceLastPayment > 35;
    }).length;
  }, [tenants, payments]);

  const monthlyPaymentsData = useMemo(() => {
    const months: { name: string; payments: number; sortKey: string }[] = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = startOfMonth(subMonths(today, i));
      months.push({ name: format(d, "MMM ''yy"), payments: 0, sortKey: format(d, 'yyyy-MM') });
    }
    payments.forEach((p) => {
      const key = format(new Date(p.date), 'yyyy-MM');
      const bucket = months.find((m) => m.sortKey === key);
      if (bucket) bucket.payments += p.amount;
    });
    return months.map(({ name, payments: amt }) => ({ name, payments: amt }));
  }, [payments]);

  const tenantStatusData = useMemo(() => {
    const inactive = tenants.filter((t) => t.status === 'inactive').length;
    const atRisk = delinquentTenantsCount;
    const active = Math.max(0, activeTenantsCount - atRisk);
    return [
      { name: 'active', label: `Active ${terminology.plural}`, value: active, fill: 'var(--color-active)' },
      { name: 'atRisk', label: 'At Risk', value: atRisk, fill: 'var(--color-atRisk)' },
      { name: 'inactive', label: 'Inactive', value: inactive, fill: 'var(--color-inactive)' },
    ].filter((d) => d.value > 0);
  }, [tenants, activeTenantsCount, delinquentTenantsCount, terminology.plural]);

  return (
    <div className="container mx-auto space-y-8 py-2">
      <DashboardPageHeader
        title="Dashboard"
        subtitle={`Welcome to RentPilot. Here's how your ${terminology.plural.toLowerCase()} and collections are doing.`}
        icon={LayoutDashboard}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardStatCard
          label={`Active ${terminology.plural}`}
          value={activeTenantsCount}
          description={`Currently active ${terminology.plural.toLowerCase()} in the system`}
          icon={Users}
          variant="blue"
          href="/tenants"
          actionLabel={`View ${terminology.plural}`}
          staggerIndex={0}
          ready={ready}
        />
        <DashboardStatCard
          label="Payments This Month"
          value={currentMonthPaymentsTotal}
          description="Total amount collected this month"
          icon={DollarSign}
          variant="emerald"
          formatValue={(n) => `₱${n.toLocaleString()}`}
          href="/payments"
          actionLabel="View Payments"
          staggerIndex={1}
          ready={ready}
        />
        <DashboardStatCard
          label="Potential Delinquencies"
          value={delinquentTenantsCount}
          description={`${terminology.plural} who may be overdue`}
          icon={AlertTriangle}
          variant="rose"
          href="/reports"
          actionLabel="View Reports"
          staggerIndex={2}
          ready={ready}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <DashboardChartCard
          title="Collections Trend"
          description="Payment totals over the last 6 months"
          icon={TrendingUp}
          className="lg:col-span-3"
          staggerIndex={0}
        >
          {ready ? (
            <ChartContainer config={paymentsChartConfig} className="min-h-[280px] w-full">
              <AreaChart data={monthlyPaymentsData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="paymentsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-payments)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-payments)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `₱${Number(v).toLocaleString()}`}
                  width={72}
                />
                <ChartTooltipContent
                  formatter={(value) => [`₱${Number(value).toLocaleString()}`, 'Collections']}
                />
                <Area
                  type="monotone"
                  dataKey="payments"
                  stroke="var(--color-payments)"
                  fill="url(#paymentsGradient)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: 'var(--color-payments)' }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ChartContainer>
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">Loading chart…</p>
          )}
        </DashboardChartCard>

        <DashboardChartCard
          title={`${terminology.plural} Overview`}
          description="Status breakdown across your portfolio"
          icon={Users}
          className="lg:col-span-2"
          staggerIndex={1}
        >
          {ready && tenantStatusData.length > 0 ? (
            <ChartContainer config={tenantChartConfig} className="mx-auto min-h-[280px] w-full max-w-xs">
              <PieChart>
                <ChartTooltipContent
                  formatter={(value, _name, item) => [
                    Number(value).toLocaleString(),
                    (item?.payload as { label?: string })?.label ?? _name,
                  ]}
                />
                <Pie
                  data={tenantStatusData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  strokeWidth={2}
                  stroke="hsl(var(--card))"
                >
                  {tenantStatusData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartLegendContent nameKey="label" />
              </PieChart>
            </ChartContainer>
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">No tenant data yet.</p>
          )}
        </DashboardChartCard>
      </div>

      <Card
        className={cn(
          'border-border/60 shadow-lg transition-shadow duration-300 hover:shadow-xl',
          'animate-in fade-in slide-in-from-bottom-4 fill-mode-both duration-700'
        )}
        style={{ animationDelay: '400ms' }}
      >
        <CardHeader>
          <CardTitle className="font-headline">Quick Actions</CardTitle>
          <CardDescription>Jump to common tasks in one click.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Link href="/tenants">
            <Button className="w-full transition-transform duration-200 hover:scale-[1.02]" variant="default">
              <Users className="mr-2 h-4 w-4" /> Manage {terminology.plural}
            </Button>
          </Link>
          <Link href="/payments">
            <Button className="w-full transition-transform duration-200 hover:scale-[1.02]" variant="default">
              <CreditCard className="mr-2 h-4 w-4" /> Record Payment
            </Button>
          </Link>
          <Link href="/reports">
            <Button className="w-full transition-transform duration-200 hover:scale-[1.02]" variant="default">
              <BarChart3 className="mr-2 h-4 w-4" /> Generate Reports
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const { terminology } = useAppContext();

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user?.role === 'tenant') {
    return <TenantDashboard />;
  }

  return <AdminClientDashboard />;
}
