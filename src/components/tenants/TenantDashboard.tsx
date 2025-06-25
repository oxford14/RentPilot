

"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAppContext } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { PaymentsTable } from '@/components/payments/PaymentsTable';
import { calculateTenantBalance } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { DollarSign, CheckCircle2, FileText, Info, ShieldCheck, Banknote, CalendarClock, ListChecks, Home } from 'lucide-react';
import { startOfDay } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';

export function TenantDashboard() {
  const { user } = useAuth();
  const { tenants, payments, additionalDues } = useAppContext();
  const [balance, setBalance] = useState<number | null>(null);
  const [clientToday, setClientToday] = useState<Date | null>(null);
  const [nextDueDate, setNextDueDate] = useState<Date | null>(null);

  const currentTenant = useMemo(() => {
    if (!user?.tenantId) return null;
    return tenants.find(t => t.id === user.tenantId);
  }, [user, tenants]);
  
  useEffect(() => {
    setClientToday(startOfDay(new Date()));
  }, []);

  useEffect(() => {
    if (currentTenant && clientToday) {
      const currentBalance = calculateTenantBalance(currentTenant, payments, additionalDues, clientToday);
      setBalance(currentBalance);
      
      const getAnniversaryForMonth = (tenant: import('@/lib/types').Tenant, refDate: Date): Date => {
          const joinDate = new Date(tenant.joinDate);
          const joinDay = joinDate.getUTCDate();
          const refYear = refDate.getUTCFullYear();
          const refMonth = refDate.getUTCMonth();
          
          const lastDayInMonth = new Date(Date.UTC(refYear, refMonth + 1, 0)).getUTCDate();
          const anniversaryDay = Math.min(joinDay, lastDayInMonth);
          
          return new Date(Date.UTC(refYear, refMonth, anniversaryDay));
      };

      const anniversaryThisMonth = getAnniversaryForMonth(currentTenant, clientToday);
      if (anniversaryThisMonth > clientToday) {
        setNextDueDate(anniversaryThisMonth);
      } else {
        const nextMonthDate = new Date(Date.UTC(clientToday.getUTCFullYear(), clientToday.getUTCMonth() + 1, 1));
        setNextDueDate(getAnniversaryForMonth(currentTenant, nextMonthDate));
      }
    }
  }, [currentTenant, payments, additionalDues, clientToday]);
  
  const unpaidDues = useMemo(() => {
    if (!currentTenant || !clientToday) return [];
    return additionalDues.filter(due => 
        due.tenantId === currentTenant.id && 
        due.status === 'unpaid' && 
        new Date(due.dueDate) < new Date(Date.UTC(clientToday.getFullYear(), clientToday.getMonth(), clientToday.getDate() + 1))
    );
  }, [currentTenant, additionalDues, clientToday]);


  if (!currentTenant) {
    return (
        <div className="container mx-auto py-2">
            <p>Loading tenant information...</p>
        </div>
    );
  }

  const balanceInfo = useMemo(() => {
    if (balance === null) return null;
    
    let text = "";
    let icon = <Info className="h-5 w-5 text-muted-foreground" />;
    let amountColor = "text-foreground";

    if (balance > 0) {
        text = "Current Amount Due:";
        icon = <DollarSign className="h-5 w-5 text-destructive" />;
        amountColor = "text-destructive";
    } else if (balance < 0) {
        text = "Current Credit:";
        icon = <CheckCircle2 className="h-5 w-5 text-green-500" />;
        amountColor = "text-green-600";
    } else {
        text = "Current Balance:";
        icon = <DollarSign className="h-5 w-5 text-muted-foreground" />;
    }
    return { text, icon, amount: Math.abs(balance), amountColor };
  }, [balance]);

  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-headline">My Dashboard</h1>
        <p className="text-muted-foreground">Welcome, {currentTenant.name}. Here is your payment summary.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 shadow-lg">
          <CardHeader>
              <CardTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5 text-primary" /> Next Rent Due</CardTitle>
          </CardHeader>
          <CardContent>
              <p className="text-3xl font-bold text-center">
                  {nextDueDate ? new Date(nextDueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : 'N/A'}
              </p>
          </CardContent>
        </Card>
        <Card className="md:col-span-2 shadow-lg">
            <CardHeader>
                <CardTitle className="font-headline text-lg">Your Account Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                        <Banknote className="h-5 w-5 text-primary" />
                        <span className="font-semibold text-lg">{balance > 0 ? 'Amount Due' : (balance < 0 ? 'Credit' : 'Balance')}</span>
                    </div>
                    <span className={cn("font-bold text-xl", balanceInfo?.amountColor)}>
                        ₱{balanceInfo?.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>
                 <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        <span className="font-semibold text-lg">Security Deposit</span>
                    </div>
                    <span className="font-bold text-xl text-primary">
                        ₱{(currentTenant.securityDeposit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>
            </CardContent>
        </Card>
      </div>
      
       <Card className="shadow-lg">
        <CardHeader>
           <div className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary" />
              <CardTitle className="font-headline text-lg">Outstanding Additional Dues</CardTitle>
           </div>
          <CardDescription>
            A record of your unpaid additional charges.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {unpaidDues.length > 0 ? (
            <div className="rounded-lg border shadow-sm overflow-hidden bg-card">
              <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className="text-right">Amount (₱)</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {unpaidDues.map(due => (
                        <TableRow key={due.id}>
                            <TableCell>{new Date(due.dueDate).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{due.type}</Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{due.notes || '-'}</TableCell>
                            <TableCell className="text-right font-medium">
                                {due.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <Home className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg">No Outstanding Dues</p>
              <p className="text-sm">You have no unpaid additional charges.</p>
            </div>
          )}
        </CardContent>
      </Card>


      <Card className="shadow-lg">
        <CardHeader>
           <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="font-headline text-lg">Payment History</CardTitle>
           </div>
          <CardDescription>
            A record of all your payments and applied discounts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PaymentsTable 
            tenantId={currentTenant.id} 
            onEdit={() => {}} 
            onDelete={() => {}} 
          />
        </CardContent>
      </Card>
    </div>
  );
}
