
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { PaymentForm } from '@/components/payments/PaymentForm';
import { PaymentsTable } from '@/components/payments/PaymentsTable';
import { TenantsListForPayments } from '@/components/payments/TenantsListForPayments';
import type { Tenant, Payment } from '@/lib/types';
import { PlusCircle, UserSearch, FileText, Users, DollarSign, CheckCircle2, ShieldCheck, Banknote, Send, ChevronDown, Home, ListPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAppContext } from '@/contexts/AppContext'; 
import { calculateTenantBalanceBreakdown, isTenantCurrentlyDueForRent } from '@/lib/utils';
import { cn } from '@/lib/utils';
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


const formatCurrency = (num: number) => num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function PaymentsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const { payments, tenants, deletePayment, systemTimezone, additionalDues } = useAppContext(); 
  const { toast } = useToast();
  
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
  const [isApplyDepositOpen, setIsApplyDepositOpen] = useState(false);
  const [clientToday, setClientToday] = useState<Date | null>(null);
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'today' | 'this_week' | 'this_month'>('all');

  useEffect(() => {
    const now = new Date();
    const timeZone = systemTimezone || 'Etc/UTC';

    try {
        const dateParts = new Intl.DateTimeFormat('en-CA', {
            year: 'numeric', month: '2-digit', day: '2-digit', timeZone,
        }).formatToParts(now).reduce((acc, part) => {
            if (part.type !== 'literal') {
                (acc as any)[part.type] = parseInt(part.value);
            }
            return acc;
        }, {} as Record<string, number>);
        
        const todayInSystemTimezone = new Date(Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day));
        setClientToday(todayInSystemTimezone);
    } catch (e) {
        console.error("Failed to parse date with system timezone, falling back to UTC.", e);
        const now = new Date();
        setClientToday(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())));
    }
  }, [systemTimezone]);

  const handleOpenForm = (payment?: Payment) => {
    setEditingPayment(payment || null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setEditingPayment(null);
    setIsFormOpen(false);
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
  
  const selectedTenant = useMemo(() => {
      if (!selectedTenantId) return null;
      return tenants.find(t => t.id === selectedTenantId) || null;
  }, [selectedTenantId, tenants]);

  const handleSelectTenant = (tenant: Tenant) => {
    setSelectedTenantId(tenant.id);
  };

  const balanceBreakdown = useMemo(() => {
    if (!selectedTenant || !clientToday) return null;
    return calculateTenantBalanceBreakdown(selectedTenant, payments, additionalDues, clientToday);
  }, [selectedTenant, payments, additionalDues, clientToday]);

  const balanceInfo = useMemo(() => {
    if (!balanceBreakdown) return null;
    const { total } = balanceBreakdown;
    let text = total > 0 ? "Current Amount Due:" : (total < 0 ? "Current Credit:" : "Current Balance:");
    let icon = total > 0 ? <Banknote className="h-4 w-4 text-destructive" /> : (total < 0 ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Banknote className="h-4 w-4 text-muted-foreground" />);
    let amountColor = total > 0 ? "text-destructive" : (total < 0 ? "text-green-600" : "text-foreground");
    return { text, icon, amount: Math.abs(total), amountColor };
  }, [balanceBreakdown]);


  const canApplyDeposit = selectedTenant && (selectedTenant.securityDeposit || 0) > 0 && balanceBreakdown !== null && balanceBreakdown.total > 0;

  return (
    <div className="container mx-auto py-2 space-y-6">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-bold font-headline">Payment Tracking</CardTitle>
              <CardDescription>Select a tenant to view their payments or record a new one.</CardDescription>
            </div>
            <Button onClick={() => handleOpenForm()} variant="default" className="shadow-md hover:shadow-lg transition-shadow w-full sm:w-auto">
              <PlusCircle className="mr-2 h-5 w-5" /> Record New Payment
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle className="font-headline text-lg">Tenants</CardTitle>
            </div>
            <CardDescription className="text-xs">Search and select a tenant.</CardDescription>
            <div className="relative pt-2">
              <UserSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground mt-1" />
              <Input
                  type="text"
                  placeholder="Search tenants by name/email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full shadow-sm"
                  autoComplete="off"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
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
                    {selectedTenant ? `Payment History for ${selectedTenant.name}` : "Payment History"}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Select value={filterPeriod} onValueChange={(value) => setFilterPeriod(value as any)}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Filter by date..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Time</SelectItem>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="this_week">This Week</SelectItem>
                            <SelectItem value="this_month">This Month</SelectItem>
                        </SelectContent>
                    </Select>
                    {selectedTenant && (
                      <Button onClick={() => handleOpenForm()} size="sm" className="shadow-sm">
                          <DollarSign className="mr-2 h-4 w-4" />
                          Pay
                      </Button>
                    )}
                </div>
            </div>
            <CardDescription className="text-xs pt-2">
              {selectedTenant ? `Showing payments for ${selectedTenant.name}.` : "Select a tenant from the list to view their payments."}
            </CardDescription>
            {selectedTenant && balanceInfo && (
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
                              <div className="flex justify-between items-center">
                                  <span className="text-muted-foreground flex items-center gap-1.5"><Home className="w-4 h-4" /> Rent Due</span>
                                  <span>₱{formatCurrency(balanceBreakdown?.rentDue ?? 0)}</span>
                              </div>
                              {balanceBreakdown?.unpaidDues.map(due => (
                                  <div key={due.id} className="flex justify-between items-center">
                                      <span className="text-muted-foreground flex items-center gap-1.5"><ListPlus className="w-4 h-4" /> {due.type}</span>
                                      <span>₱{formatCurrency(due.amount)}</span>
                                  </div>
                              ))}
                              <Separator className="my-2"/>
                              <div className="flex justify-between items-center font-bold">
                                  <span>Total Due</span>
                                  <span>₱{formatCurrency(balanceBreakdown?.total ?? 0)}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              <span>This tenant is fully paid up. No outstanding dues.</span>
                            </div>
                          )}
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            )}
             {selectedTenant && (
               <div className="p-3 border rounded-md bg-muted/50 text-sm mt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <span className="font-medium">Security Deposit on File:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-primary">
                        ₱{(selectedTenant.securityDeposit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
          <CardContent className="flex-grow">
            <PaymentsTable 
              tenantId={selectedTenantId} 
              onEdit={handleOpenForm}
              onDelete={handleDeletePayment}
              filterPeriod={filterPeriod}
            />
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

      {isApplyDepositOpen && selectedTenant && balanceBreakdown !== null && (
        <ApplyDepositDialog
          isOpen={isApplyDepositOpen}
          onClose={() => setIsApplyDepositOpen(false)}
          tenant={selectedTenant}
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
