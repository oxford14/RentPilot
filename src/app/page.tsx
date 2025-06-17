
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAppContext } from "@/contexts/AppContext";
import { Users, CreditCard, AlertTriangle, DollarSign } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { tenants, payments } = useAppContext();

  const activeTenants = tenants.filter(t => t.status === 'active').length;
  const totalPaymentsThisMonth = payments.filter(p => {
    const paymentDate = new Date(p.date);
    const today = new Date();
    return paymentDate.getMonth() === today.getMonth() && paymentDate.getFullYear() === today.getFullYear();
  }).reduce((sum, p) => sum + p.amount, 0);

  // This is a simplified delinquency calculation. A more robust one would be in reports.
  const potentiallyDelinquentTenants = tenants.filter(tenant => {
    if (tenant.status === 'inactive') return false;
    const tenantPayments = payments.filter(p => p.tenantId === tenant.id);
    const lastPayment = tenantPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    if (!lastPayment) return true; // No payments ever
    
    const today = new Date();
    const lastPaymentDate = new Date(lastPayment.date);
    // If last payment was more than 35 days ago (approx > 1 month + grace period)
    const daysSinceLastPayment = (today.getTime() - lastPaymentDate.getTime()) / (1000 * 3600 * 24);
    return daysSinceLastPayment > 35;
  }).length;

  return (
    <div className="container mx-auto py-2">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to TenantTracker. Here's a quick overview.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-headline">Active Tenants</CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTenants}</div>
            <p className="text-xs text-muted-foreground">Currently active tenants in the system.</p>
            <Link href="/tenants" passHref className="mt-2">
              <Button variant="outline" size="sm" className="mt-2">View Tenants</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-headline">Payments This Month</CardTitle>
            <DollarSign className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPaymentsThisMonth.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total amount collected this month.</p>
             <Link href="/payments" passHref className="mt-2">
              <Button variant="outline" size="sm" className="mt-2">View Payments</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-headline">Potential Delinquencies</CardTitle>
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{potentiallyDelinquentTenants}</div>
            <p className="text-xs text-muted-foreground">Tenants who might be overdue.</p>
             <Link href="/reports" passHref className="mt-2">
              <Button variant="outline" size="sm" className="mt-2">View Reports</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8 shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Quick Actions</CardTitle>
          <CardDescription>Quickly navigate to common tasks.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/tenants" passHref>
            <Button className="w-full" variant="default">
              <Users className="mr-2 h-4 w-4" /> Manage Tenants
            </Button>
          </Link>
          <Link href="/payments" passHref>
            <Button className="w-full" variant="default">
              <CreditCard className="mr-2 h-4 w-4" /> Record Payment
            </Button>
          </Link>
           <Link href="/reports" passHref>
            <Button className="w-full" variant="default">
              <BarChart3 className="mr-2 h-4 w-4" /> Generate Reports
            </Button>
          </Link>
        </CardContent>
      </Card>

    </div>
  );
}
