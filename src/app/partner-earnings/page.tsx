
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import type { DateRange } from 'react-day-picker';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DateRangeSelector } from '@/components/reports/DateRangeSelector';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Handshake, TrendingUp, TrendingDown, DollarSign, PiggyBank, Users, Info } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { useRouter } from 'next/navigation';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'PHP',
  }).format(value);
};

export default function PartnerEarningsPage() {
  const { payments, expenses, clients, viewingAsClientId } = useAppContext();
  const { user } = useAuth();
  const router = useRouter();

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const today = new Date();
    const from = startOfMonth(today);
    const to = endOfMonth(today);
    return { from, to };
  });
  
  const client = useMemo(() => {
    const currentContextClientId = user?.isSuperAdmin ? viewingAsClientId : user?.clientId;
    if (!currentContextClientId) return null;
    return clients.find(c => c.id === currentContextClientId);
  }, [clients, user, viewingAsClientId]);

  // Page level protection
  useEffect(() => {
    const isAuthorized = user?.isSuperAdmin || user?.role === 'admin';
    if (client && client.name !== 'i-VirtuaTech' || !isAuthorized) {
        router.push('/');
    }
  }, [client, user, router]);

  const { grossIncome, totalExpenses } = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return { grossIncome: 0, totalExpenses: 0 };
    
    const startDate = startOfDay(dateRange.from);
    const endDate = endOfDay(dateRange.to);

    const filteredPayments = payments.filter(p => {
        const paymentDate = new Date(p.date);
        return paymentDate >= startDate && paymentDate <= endDate && p.paymentMethod !== 'Security Deposit';
    });

    const filteredExpenses = expenses.filter(e => {
        const expenseDate = new Date(e.date);
        return expenseDate >= startDate && expenseDate <= endDate;
    });

    const gross = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    const expensesTotal = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    
    return { grossIncome: gross, totalExpenses: expensesTotal };
  }, [payments, expenses, dateRange]);

  const netOperatingIncome = grossIncome - totalExpenses;
  const companyFundsContribution = netOperatingIncome > 0 ? netOperatingIncome * 0.10 : 0;
  const profitToShare = netOperatingIncome - companyFundsContribution;

  const partnerShares = useMemo(() => {
    if (profitToShare <= 0) {
      return { Andrew: 0, Abie: 0, Crispulo: 0 };
    }
    const andrewShare = profitToShare * 0.60;
    const remainingForSplit = profitToShare * 0.40;
    const abieShare = remainingForSplit * 0.666;
    const crispuloShare = remainingForSplit * 0.333;

    return {
      Andrew: andrewShare,
      Abie: abieShare,
      Crispulo: crispuloShare,
    };
  }, [profitToShare]);

  if (!client || client.name !== 'i-VirtuaTech' || (!user?.isSuperAdmin && user?.role !== 'admin')) {
    return (
      <div className="container mx-auto py-2">
        <p>Loading or unauthorized...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-2 space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline mb-2 flex items-center">
          <Handshake className="mr-3 h-8 w-8 text-primary" />
          Partner Earnings
        </h1>
        <p className="text-muted-foreground">Calculate profit shares based on monthly performance for i-VirtuaTech.</p>
      </div>
      
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline">Date Range</CardTitle>
          <CardDescription>Select a date range to calculate the earnings distribution.</CardDescription>
        </CardHeader>
        <CardContent>
          <DateRangeSelector onDateChange={setDateRange} />
        </CardContent>
      </Card>

      <Card className="shadow-xl">
        <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
            <CardDescription>
                Summary for the period from {dateRange?.from ? format(dateRange.from, "LLL dd, y") : ''} to {dateRange?.to ? format(dateRange.to, "LLL dd, y") : ''}.
            </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="p-4 border rounded-lg bg-green-50/50">
                <div className="flex items-center gap-3">
                    <TrendingUp className="h-7 w-7 text-green-500" />
                    <div>
                        <p className="text-sm text-muted-foreground">Gross Income</p>
                        <p className="text-xl font-semibold text-green-600">{formatCurrency(grossIncome)}</p>
                    </div>
                </div>
            </div>
            <div className="p-4 border rounded-lg bg-red-50/50">
                <div className="flex items-center gap-3">
                    <TrendingDown className="h-7 w-7 text-red-500" />
                    <div>
                        <p className="text-sm text-muted-foreground">Total Expenses</p>
                        <p className="text-xl font-semibold text-destructive">{formatCurrency(totalExpenses)}</p>
                    </div>
                </div>
            </div>
            <div className="p-4 border rounded-lg bg-blue-50/50">
                 <div className="flex items-center gap-3">
                    <DollarSign className="h-7 w-7 text-blue-500" />
                    <div>
                        <p className="text-sm text-muted-foreground">Net Operating Income</p>
                        <p className="text-xl font-semibold text-blue-600">{formatCurrency(netOperatingIncome)}</p>
                    </div>
                </div>
            </div>
             <div className="p-4 border rounded-lg bg-indigo-50/50 md:col-span-2 lg:col-span-3">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <PiggyBank className="h-7 w-7 text-indigo-500" />
                        <div>
                            <p className="text-sm text-muted-foreground">Company Funds (10% of Net)</p>
                            <p className="text-xl font-semibold text-indigo-600">{formatCurrency(companyFundsContribution)}</p>
                        </div>
                    </div>
                     <div className="flex items-center gap-3">
                        <DollarSign className="h-7 w-7 text-primary" />
                        <div>
                            <p className="text-sm text-muted-foreground">Total Profit to Share</p>
                            <p className="text-xl font-semibold text-primary">{formatCurrency(profitToShare)}</p>
                        </div>
                    </div>
                </div>
            </div>
        </CardContent>
      </Card>
      
       <Card className="shadow-xl">
        <CardHeader>
            <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5"/>Partner Shares</CardTitle>
            <CardDescription>Calculated profit distribution for each partner.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                <p className="text-lg font-medium">Andrew (60%)</p>
                <p className="text-lg font-bold text-primary">{formatCurrency(partnerShares.Andrew)}</p>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                <p className="text-lg font-medium">Abie (26.64%)</p>
                <p className="text-lg font-bold text-primary">{formatCurrency(partnerShares.Abie)}</p>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                <p className="text-lg font-medium">Crispulo (13.32%)</p>
                <p className="text-lg font-bold text-primary">{formatCurrency(partnerShares.Crispulo)}</p>
            </div>
             <Alert className="mt-4">
                <Info className="h-4 w-4" />
                <AlertTitle>Note on Rounding</AlertTitle>
                <AlertDescription>
                    The percentages for Abie (66.6% of 40%) and Crispulo (33.3% of 40%) result in non-terminating decimals. The final shares are rounded to two decimal places, which may result in a tiny discrepancy from the total profit to share.
                </AlertDescription>
            </Alert>
        </CardContent>
       </Card>

    </div>
  );
}
