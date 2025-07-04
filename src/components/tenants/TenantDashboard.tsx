

"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { useAppContext } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { PaymentsTable } from '@/components/payments/PaymentsTable';
import { calculateTenantBalance } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { DollarSign, CheckCircle2, FileText, Info, ShieldCheck, Banknote, CalendarClock, ListChecks, Home, Calendar, Clock, FileSignature, Handshake } from 'lucide-react';
import { startOfDay, format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { RentAdjustmentRequestDialog } from './RentAdjustmentRequestDialog';

export function TenantDashboard() {
  const { user } = useAuth();
  const { tenants, payments, additionalDues, signedContracts, rentAdjustmentRequests } = useAppContext();
  const [balance, setBalance] = useState<number | null>(null);
  const [clientToday, setClientToday] = useState<Date | null>(null);
  const [nextDueDate, setNextDueDate] = useState<Date | null>(null);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);

  const currentTenant = useMemo(() => {
    if (!user?.tenantId) return null;
    return tenants.find(t => t.id === user.tenantId);
  }, [user, tenants]);
  
  const pendingContract = useMemo(() => {
    if (!currentTenant?.activeContractId) return null;
    const contract = signedContracts.find(c => c.id === currentTenant.activeContractId);
    return (contract && contract.status === 'pending') ? contract : null;
  }, [currentTenant, signedContracts]);

  const pendingRentRequest = useMemo(() => {
    if (!currentTenant) return null;
    return rentAdjustmentRequests.find(r => r.tenantId === currentTenant.id && r.status === 'pending');
  }, [currentTenant, rentAdjustmentRequests]);

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
  
  const allTenantDues = useMemo(() => {
    if (!currentTenant) return [];
    return additionalDues
      .filter(due => due.tenantId === currentTenant.id)
      .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
  }, [currentTenant, additionalDues]);

  const monthlyRentHistory = useMemo(() => {
    if (!currentTenant || !clientToday || !currentTenant.rent_history || currentTenant.rent_history.length === 0) return [];

    const history = [];
    const startDate = new Date(currentTenant.joinDate);
    // Start loop from the first day of the month the tenant joined
    let loopMonthStart = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));

    while(loopMonthStart <= clientToday) {
        // Find the correct rent rate for this month
        const activeRentEntry = currentTenant.rent_history.find(entry => {
            const entryStartDate = new Date(entry.startDate);
            const entryEndDate = entry.endDate ? new Date(entry.endDate) : null;
            return loopMonthStart >= entryStartDate && (!entryEndDate || loopMonthStart <= entryEndDate);
        });

        const rateForMonth = activeRentEntry ? activeRentEntry.rate : 0;
        
        history.push({
            month: loopMonthStart.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
            rent: rateForMonth,
        });

        // Move to next month
        loopMonthStart.setUTCMonth(loopMonthStart.getUTCMonth() + 1);
    }
    return history.reverse();
  }, [currentTenant, clientToday]);


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
    <>
      <div className="container mx-auto py-2 space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold font-headline">My Dashboard</h1>
          <p className="text-muted-foreground">Welcome, {currentTenant.name}. Here is your payment summary.</p>
        </div>

        {pendingContract && (
          <Card className="shadow-lg border-primary bg-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <FileSignature className="h-6 w-6" />
                Action Required: New Contract
              </CardTitle>
              <CardDescription className="text-primary/90">
                You have a new contract pending your signature. Please review and sign it at your earliest convenience.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Link href={`/contract/sign/${pendingContract.id}`} passHref>
                <Button>Review & Sign Contract</Button>
              </Link>
            </CardFooter>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{balanceInfo?.text.replace(':', '')}</CardTitle>
                  {balanceInfo?.icon}
              </CardHeader>
              <CardContent>
                  <div className={cn("text-2xl font-bold", balanceInfo?.amountColor)}>
                      ₱{balanceInfo?.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-muted-foreground">as of today</p>
              </CardContent>
          </Card>
          <Card className="shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Next Rent Due</CardTitle>
                  <CalendarClock className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">
                      {nextDueDate ? new Date(nextDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : 'N/A'}
                  </div>
                   <p className="text-xs text-muted-foreground">based on your join date</p>
              </CardContent>
          </Card>
          <Card className="shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Start Date</CardTitle>
                  <Calendar className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">
                      {new Date(currentTenant.joinDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
                  </div>
                   <p className="text-xs text-muted-foreground">Your official contract start</p>
              </CardContent>
          </Card>
          <Card className="shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Security Deposit</CardTitle>
                  <ShieldCheck className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">
                      ₱{(currentTenant.securityDeposit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                   <p className="text-xs text-muted-foreground">on file with your landlord</p>
              </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <CardTitle className="font-headline text-lg flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-primary" />
                  Monthly Rent History
                </CardTitle>
                <CardDescription>A summary of your monthly rent payments and status.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsRequestDialogOpen(true)} disabled={!!pendingRentRequest}>
                  <Handshake className="mr-2 h-4 w-4" />
                  {pendingRentRequest ? 'Request Pending' : 'Request Rent Adjustment'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {monthlyRentHistory.length > 0 ? (
              <div className="rounded-lg border shadow-sm overflow-hidden bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Rent Amount (₱)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyRentHistory.map((entry) => (
                      <TableRow key={entry.month}>
                        <TableCell className="font-medium">{entry.month}</TableCell>
                        <TableCell className="text-right">
                          {entry.rent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <p>No rent history to display yet.</p>
              </div>
            )}
          </CardContent>
        </Card>
        
         <Card className="shadow-lg">
          <CardHeader>
             <div className="flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-primary" />
                <CardTitle className="font-headline text-lg">Additional Dues History</CardTitle>
             </div>
            <CardDescription>
              A record of all your additional charges.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {allTenantDues.length > 0 ? (
              <div className="rounded-lg border shadow-sm overflow-hidden bg-card">
                <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Notes</TableHead>
                          <TableHead className="text-right">Amount (₱)</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {allTenantDues.map(due => {
                        const isEffectivelyPaid = due.status === 'paid' || (balance !== null && balance <= 0);
                        return (
                          <TableRow key={due.id}>
                              <TableCell>{new Date(due.dueDate).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{due.type}</Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground">{due.notes || '-'}</TableCell>
                              <TableCell className="text-right font-medium">
                                  {due.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-center">
                                  {due.status === 'paid' ? (
                                      <Badge variant="default" className="bg-green-500/20 text-green-700 border-green-400">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Paid
                                      </Badge>
                                  ) : (balance !== null && balance <= 0) ? (
                                      <Badge variant="default" className="bg-green-500/20 text-green-700 border-green-400">
                                          <CheckCircle2 className="h-3 w-3 mr-1" />
                                          Paid
                                      </Badge>
                                  ) : (
                                      <Badge variant="destructive" className="bg-yellow-500/20 text-yellow-700 border-yellow-400">
                                          <Clock className="h-3 w-3 mr-1" />
                                          Unpaid
                                      </Badge>
                                  )}
                              </TableCell>
                          </TableRow>
                      )})}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <Home className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg">No Additional Dues</p>
                <p className="text-sm">You have no additional charges recorded.</p>
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
              showActions={false} 
            />
          </CardContent>
        </Card>
      </div>
      {isRequestDialogOpen && (
        <RentAdjustmentRequestDialog 
          isOpen={isRequestDialogOpen}
          onClose={() => setIsRequestDialogOpen(false)}
          tenant={currentTenant}
        />
      )}
    </>
  );
}
