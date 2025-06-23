
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAppContext } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { PaymentsTable } from '@/components/payments/PaymentsTable';
import { calculateTenantBalance } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { DollarSign, CheckCircle2, FileText, Info } from 'lucide-react';
import { startOfDay } from 'date-fns';

export function TenantDashboard() {
  const { user } = useAuth();
  const { tenants, payments } = useAppContext();
  const [balance, setBalance] = useState<number | null>(null);
  const [clientToday, setClientToday] = useState<Date | null>(null);

  const currentTenant = useMemo(() => {
    if (!user?.tenantId) return null;
    return tenants.find(t => t.id === user.tenantId);
  }, [user, tenants]);
  
  useEffect(() => {
    setClientToday(startOfDay(new Date()));
  }, []);

  useEffect(() => {
    if (currentTenant && clientToday) {
      const currentBalance = calculateTenantBalance(currentTenant, payments, clientToday);
      setBalance(currentBalance);
    }
  }, [currentTenant, payments, clientToday]);

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
        text = "Current Credit/Deposit:";
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

      {balanceInfo && (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="font-headline text-lg">Your Balance</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                        {balanceInfo.icon}
                        <span className="font-semibold text-xl">{balanceInfo.text}</span>
                    </div>
                    <span className={cn("font-bold text-2xl", balanceInfo.amountColor)}>
                        ₱{balanceInfo.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>
            </CardContent>
        </Card>
      )}

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
          <PaymentsTable tenantId={currentTenant.id} />
        </CardContent>
      </Card>
    </div>
  );
}
