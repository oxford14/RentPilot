

"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { PaymentForm } from '@/components/payments/PaymentForm';
import { PaymentsTable } from '@/components/payments/PaymentsTable';
import { TenantsListForPayments } from '@/components/payments/TenantsListForPayments';
import type { Tenant, Payment, BalanceBreakdown } from '@/lib/types';
import { PlusCircle, UserSearch, FileText, Users, DollarSign, CheckCircle2, ShieldCheck, Banknote, Send, ChevronDown, Home, ListPlus, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAppContext } from '@/contexts/AppContext'; 
import { cn, calculateTenantBalanceBreakdown } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { ApplyDepositDialog } from '@/components/payments/ApplyDepositDialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { startOfMonth, endOfMonth } from 'date-fns';


const formatCurrency = (num: number) => num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function PaymentsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const { deletePayment, tenants, payments, additionalDues, terminology } = useAppContext(); 
  const { toast } = useToast();
  
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
  const [isApplyDepositOpen, setIsApplyDepositOpen] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'today' | 'this_week' | 'this_month' | 'last_month'>('all');
  const [tenantBalanceInfo, setTenantBalanceInfo] = useState<{tenant: Tenant, breakdown: BalanceBreakdown} | null>(null);
  const [totalCollectedThisMonth, setTotalCollectedThisMonth] = useState(0);

  useEffect(() => {
    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    const total = payments
      .filter(p => {
        if (p.paymentMethod === 'Security Deposit') return false;
        const paymentDate = new Date(p.date);
        return paymentDate >= monthStart && paymentDate <= monthEnd;
      })
      .reduce((sum, p) => sum + p.amount, 0);

    setTotalCollectedThisMonth(total);
  }, [payments]);


  const handleOpenForm = (payment?: Payment, tenant?: Tenant, breakdown?: BalanceBreakdown) => {
    setEditingPayment(payment || null);
    if (tenant && breakdown) {
        setTenantBalanceInfo({tenant, breakdown});
    } else {
        setTenantBalanceInfo(null);
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setEditingPayment(null);
    setIsFormOpen(false);
    setTenantBalanceInfo(null);
  };
  
  const handleDeletePayment = (payment: Payment) => {
    setPaymentToDelete(payment);
  };
  
  const confirmDeletePayment = () => {
    if (paymentToDelete) {
      deletePayment(paymentToDelete.id);
      toast({ title: "Payment Deleted", description: "The payment record has been deleted." });
      setPaymentToDelete(null);
    }
  };
  
  const { tenant, balanceBreakdown, balanceInfo, canApplyDeposit } = useMemo(() => {
    if (!selectedTenantId) return { tenant: null, balanceBreakdown: null, balanceInfo: null, canApplyDeposit: false };
    
    const tenant = tenants.find(t => t.id === selectedTenantId) || null;
    if (!tenant) return { tenant: null, balanceBreakdown: null, balanceInfo: null, canApplyDeposit: false };
    
    const today = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
    const breakdown = calculateTenantBalanceBreakdown(tenant, payments, additionalDues, today);

    const { total } = breakdown;
    let text = total > 0 ? "Current Amount Due:" : (total < 0 ? "Current Credit:" : "Current Balance:");
    let icon = total > 0 ? <Banknote className="h-4 w-4 text-destructive" /> : (total < 0 ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Banknote className="h-4 w-4 text-muted-foreground" />);
    let amountColor = total > 0 ? "text-destructive" : (total < 0 ? "text-green-600" : "text-foreground");
    const balanceInfo = { text, icon, amount: Math.abs(total), amountColor };

    const canApply = tenant && (tenant.securityDeposit || 0) > 0 && breakdown.total > 0;

    return { tenant, balanceBreakdown: breakdown, balanceInfo, canApplyDeposit: canApply };
  }, [selectedTenantId, tenants, payments, additionalDues]);

  const handleSelectTenant = (tenant: Tenant) => {
    setSelectedTenantId(tenant.id);
  };

  return (
    <div className="container mx-auto py-2 space-y-6">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-bold font-headline">Payment Tracking</CardTitle>
              <CardDescription>Select a {terminology.single.toLowerCase()} to view their payments or record a new one.</CardDescription>
            </div>
            <div className="flex w-full sm:w-auto flex-col-reverse sm:flex-row sm:flex-wrap sm:justify-end items-stretch sm:items-center gap-4">
               <div className="p-3 border rounded-lg bg-muted/50 text-right shrink-0">
                  <p className="text-sm text-muted-foreground">Collected this month</p>
                  <p className="text-xl font-bold text-primary">₱{totalCollectedThisMonth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <Button onClick={() => handleOpenForm()} variant="default" className="shadow-md hover:shadow-lg transition-shadow w-full sm:w-auto">
                <PlusCircle className="mr-2 h-5 w-5" /> Record New Payment
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 shadow-lg flex flex-col h-[calc(100vh-20rem)]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle className="font-headline text-lg">{terminology.plural}</CardTitle>
            </div>
            <CardDescription className="text-xs">Search and select a {terminology.single.toLowerCase()}.</CardDescription>
            <div className="relative pt-2">
              <UserSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground mt-1" />
              <Input
                  type="text"
                  placeholder={`Search ${terminology.plural.toLowerCase()} by name/email...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full shadow-sm"
                  autoComplete="off"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 min-h-0">
            <TenantsListForPayments 
              onSelectTenant={handleSelectTenant} 
              searchTerm={searchTerm} 
              selectedTenantId={selectedTenantId}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-lg min-h-[300px] flex flex-col">
          <CardHeader>
            <div className="flex justify-between items-start flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <CardTitle className="font-headline text-lg">
                    {tenant ? `Payment History for ${tenant.name}` : "Payment History"}
                  </CardTitle>
                </div>
                {tenant && (
                  <Button onClick={() => handleOpenForm(undefined, tenant, balanceBreakdown)} size="sm" className="shadow-sm w-full sm:w-auto">
                      <DollarSign className="mr-2 h-4 w-4" />
                      Pay
                  </Button>
                )}
            </div>
            <CardDescription className="text-xs pt-2">
              {tenant ? `Showing payments for ${tenant.name}.` : `Select a ${terminology.single.toLowerCase()} from the list to view their payments.`}
            </CardDescription>
            {tenant && balanceInfo && balanceBreakdown && (
                <Accordion type="single" collapsible className="w-full pt-2">
                    <AccordionItem value="item-1" className="border rounded-md bg-muted/50 overflow-hidden">
                        <AccordionTrigger className="p-3 text-sm hover:no-underline [&[data-state=open]>svg]:text-primary">
                            <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-1.5">
                                    {balanceInfo.icon}
                                    <span className="font-medium">{balanceInfo.text}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={cn("font-semibold", balanceInfo.amountColor)}>
                                        ₱{formatCurrency(balanceInfo.amount)}
                                    </span>
                                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-3 border-t bg-background">
                          {(balanceBreakdown && balanceBreakdown.total > 0) ? (
                            <div className="space-y-2 text-sm">
                              <h4 className="font-semibold">Balance Breakdown</h4>
                               {balanceBreakdown.rentDueDetails.map((rentDetail, index) => (
                                  <div key={`rent-${index}`} className="flex justify-between items-center">
                                      <span className="text-muted-foreground flex items-center gap-1.5"><Home className="w-4 h-4" /> Rent ({rentDetail.month})</span>
                                      <span>₱{formatCurrency(rentDetail.rate)}</span>
                                  </div>
                              ))}
                              {balanceBreakdown.unpaidDues.map(due => (
                                <div key={due.id} className="flex justify-between items-center">
                                    <span className="text-muted-foreground flex items-center gap-1.5"><ListPlus className="w-4 h-4" /> {due.type}</span>
                                    <span>₱{formatCurrency(due.amount)}</span>
                                </div>
                              ))}
                              {(balanceBreakdown.rentDueDetails.length > 0 || balanceBreakdown.unpaidDues.length > 0) && (
                                <Separator className="my-2"/>
                              )}
                              <div className="flex justify-between items-center font-bold">
                                  <span>Total Due</span>
                                  <span>₱{formatCurrency(balanceBreakdown.total)}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              <span>This {terminology.single.toLowerCase()} is fully paid up. No outstanding dues.</span>
                            </div>
                          )}
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            )}
             {tenant && (
               <div className="p-3 border rounded-md bg-muted/50 text-sm mt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <span className="font-medium">Security Deposit on File:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-primary">
                        ₱{(tenant.securityDeposit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <Button type="button" variant="secondary" size="sm" className="h-7" onClick={() => setIsApplyDepositOpen(true)} disabled={!canApplyDeposit}>
                      <Send className="mr-1 h-4 w-4"/>
                      Use
                    </Button>
                  </div>
                </div>
               </div>
            )}
          </CardHeader>
          <CardContent className="flex-grow flex flex-col gap-4 pt-4">
             {selectedTenantId && (
              <div className="flex justify-end">
                <Select value={filterPeriod} onValueChange={(value) => setFilterPeriod(value as any)}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Filter by date..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="this_week">This Week</SelectItem>
                        <SelectItem value="this_month">This Month</SelectItem>
                        <SelectItem value="last_month">Last Month</SelectItem>
                    </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex-grow relative">
                <PaymentsTable 
                  tenantId={selectedTenantId} 
                  onEdit={handleOpenForm}
                  onDelete={handleDeletePayment}
                  filterPeriod={filterPeriod}
                />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {isFormOpen && (
        <PaymentForm
            isOpen={isFormOpen}
            onClose={handleCloseForm}
            defaultTenantId={selectedTenantId}
            payment={editingPayment}
        />
      )}

      {isApplyDepositOpen && tenant && balanceBreakdown !== null && (
        <ApplyDepositDialog
          isOpen={isApplyDepositOpen}
          onClose={() => setIsApplyDepositOpen(false)}
          tenant={tenant}
          currentBalance={balanceBreakdown.total}
        />
      )}

      <AlertDialog open={!!paymentToDelete} onOpenChange={(isOpen) => { if (!isOpen) setPaymentToDelete(null); }}>
        {paymentToDelete && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete this payment record.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeletePayment}>Delete Payment</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>

    </div>
  );
}
