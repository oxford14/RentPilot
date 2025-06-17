
"use client";

import React, { useState, useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DateRangeSelector } from '@/components/reports/DateRangeSelector';
import { DelinquencyCard } from '@/components/reports/DelinquencyCard';
import { useAppContext } from '@/contexts/AppContext';
import type { Tenant, Payment } from '@/lib/types';
import { DollarSign, Users, TrendingUp, TrendingDown } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FinancialSummary {
  totalCollected: number;
  totalOutstanding: number; // This is simplified; real calculation is complex
  activeTenantsInRange: number;
  paymentsCount: number;
}

export default function ReportsPage() {
  const { tenants, payments } = useAppContext();
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const filteredData = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) {
      return { filteredPayments: payments, relevantTenants: tenants };
    }
    const fromDate = new Date(dateRange.from);
    const toDate = new Date(dateRange.to);
    toDate.setHours(23, 59, 59, 999); // Ensure end of day for 'to' date

    const filteredPayments = payments.filter(p => {
      const paymentDate = new Date(p.date);
      return paymentDate >= fromDate && paymentDate <= toDate;
    });

    // Tenants active at any point during the range or who made payments in range
    const relevantTenantIds = new Set<string>(filteredPayments.map(p => p.tenantId));
    tenants.forEach(t => {
        const joinDate = new Date(t.joinDate);
        if (joinDate <= toDate) { // simplified: tenant joined before or during range end
            relevantTenantIds.add(t.id);
        }
    });
    const relevantTenants = tenants.filter(t => relevantTenantIds.has(t.id));

    return { filteredPayments, relevantTenants };
  }, [payments, tenants, dateRange]);

  const financialSummary = useMemo((): FinancialSummary => {
    const { filteredPayments, relevantTenants } = filteredData;
    const totalCollected = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    
    // Simplified outstanding calculation for tenants active in range
    let totalExpectedRentInPeriod = 0;
    relevantTenants.forEach(tenant => {
        if (tenant.status === 'active') { // only consider active tenants for simplicity
            const joinD = new Date(tenant.joinDate);
            const rangeStart = dateRange?.from ? new Date(dateRange.from) : joinD;
            const rangeEnd = dateRange?.to ? new Date(dateRange.to) : new Date();

            // Calculate months active within the period
            let monthsInPeriod = 0;
            let currentDate = new Date(Math.max(joinD.getTime(), rangeStart.getTime()));
            
            while(currentDate <= rangeEnd) {
                monthsInPeriod++;
                currentDate.setMonth(currentDate.getMonth() + 1);
                currentDate.setDate(1); // move to start of next month to count it
                 if(currentDate > rangeEnd && monthsInPeriod === 1 && (rangeEnd.getTime() - Math.max(joinD.getTime(), rangeStart.getTime())) / (1000 * 3600 * 24) < 15) {
                     // if period is less than 15 days and it's the first month, maybe don't count full rent.
                     // This is complex logic, for now, any part of month counts as full.
                 }
            }
            if (monthsInPeriod > 0) totalExpectedRentInPeriod += tenant.monthlyRentalRate * monthsInPeriod;
        }
    });
    const totalOutstanding = Math.max(0, totalExpectedRentInPeriod - totalCollected);

    return {
      totalCollected,
      totalOutstanding,
      activeTenantsInRange: relevantTenants.filter(t => t.status === 'active').length,
      paymentsCount: filteredPayments.length,
    };
  }, [filteredData, dateRange]);

  const tenantReportData = useMemo(() => {
    return filteredData.relevantTenants.map(tenant => {
        const tenantPayments = filteredData.filteredPayments.filter(p => p.tenantId === tenant.id);
        const totalPaidByTenant = tenantPayments.reduce((sum, p) => sum + p.amount, 0);
        // Simplified due amount for the period. 
        const monthsActiveInPeriod = 1; // Placeholder, real calculation is complex
        const dueAmount = tenant.status === 'active' ? tenant.monthlyRentalRate * monthsActiveInPeriod : 0; // Very simplified
        return {
            id: tenant.id,
            name: tenant.name,
            status: tenant.status,
            totalPaid: totalPaidByTenant,
            // balance: dueAmount - totalPaidByTenant, // This is also simplified.
            numberOfPayments: tenantPayments.length,
        };
    }).sort((a,b) => b.totalPaid - a.totalPaid);
  }, [filteredData]);


  return (
    <div className="container mx-auto py-2 space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline mb-2">Financial Reports</h1>
        <p className="text-muted-foreground">Analyze financial performance and tenant payment behavior.</p>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline">Date Range</CardTitle>
          <CardDescription>Select a date range to filter the reports below.</CardDescription>
        </CardHeader>
        <CardContent>
          <DateRangeSelector onDateChange={setDateRange} />
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-headline">Total Collected</CardTitle>
            <DollarSign className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${financialSummary.totalCollected.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{financialSummary.paymentsCount} payments received</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-headline">Outstanding (Est.)</CardTitle>
            <TrendingDown className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${financialSummary.totalOutstanding.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Estimated based on active tenants</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-headline">Active Tenants (Range)</CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{financialSummary.activeTenantsInRange}</div>
            <p className="text-xs text-muted-foreground">Tenants active in selected period</p>
          </CardContent>
        </Card>
         <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-headline">Payment Volume</CardTitle>
            <TrendingUp className="h-5 w-5 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{financialSummary.paymentsCount}</div>
            <p className="text-xs text-muted-foreground">Total payments in period</p>
          </CardContent>
        </Card>
      </div>
      
      <Card className="shadow-xl">
        <CardHeader>
            <CardTitle className="font-headline">Tenant Payment Summary</CardTitle>
            <CardDescription>Overview of payments by tenant for the selected period.</CardDescription>
        </CardHeader>
        <CardContent>
            <ScrollArea className="h-[400px]">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tenant Name</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Total Paid ($)</TableHead>
                            <TableHead className="text-center"># Payments</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tenantReportData.length > 0 ? tenantReportData.map(item => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell>{item.status === 'active' ? 'Active' : 'Inactive'}</TableCell>
                                <TableCell className="text-right">{item.totalPaid.toLocaleString()}</TableCell>
                                <TableCell className="text-center">{item.numberOfPayments}</TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                                    No tenant payment data for the selected period.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </ScrollArea>
        </CardContent>
      </Card>

      <DelinquencyCard />
    </div>
  );
}
