
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PaymentForm } from '@/components/payments/PaymentForm';
import { PaymentsTable } from '@/components/payments/PaymentsTable';
import { TenantsListForPayments } from '@/components/payments/TenantsListForPayments';
import type { Tenant, Payment } from '@/lib/types';
import { PlusCircle, UserSearch, FileText, Users, DollarSign, CheckCircle2, CalendarClock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAppContext } from '@/contexts/AppContext'; 
import { calculateTenantBalance, isTenantCurrentlyDueForRent } from '@/lib/utils';
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

export default function PaymentsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [amountDue, setAmountDue] = useState<number | null>(null); 
  const [rentStatusMessage, setRentStatusMessage] = useState<string | null>(null);
  const { payments, tenants, deletePayment, systemTimezone } = useAppContext(); 
  const { toast } = useToast();
  const [clientToday, setClientToday] = useState<Date | null>(null);

  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);

  useEffect(() => {
    // This effect now correctly determines "today" based on the system timezone.
    const now = new Date();
    const timeZone = systemTimezone || 'Etc/UTC';

    // Intl.DateTimeFormat is a standard API to format dates according to a specific timezone.
    // We use 'en-CA' format because it produces a reliable YYYY-MM-DD format.
    try {
        const dateParts = new Intl.DateTimeFormat('en-CA', {
            year: 'numeric', month: '2-digit', day: '2-digit', timeZone,
        }).formatToParts(now).reduce((acc, part) => {
            if (part.type !== 'literal') {
                (acc as any)[part.type] = parseInt(part.value);
            }
            return acc;
        }, {} as Record<string, number>);
        
        // We construct a new UTC date from the parts, which represents the start of "today" in the target timezone.
        const todayInSystemTimezone = new Date(Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day));
        setClientToday(todayInSystemTimezone);
    } catch (e) {
        console.error("Failed to parse date with system timezone, falling back to UTC.", e);
        // Fallback to pure UTC if Intl API fails for some reason
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


  const handleSelectTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
  };

  useEffect(() => {
    if (selectedTenant && clientToday) {
      const currentBalance = calculateTenantBalance(selectedTenant, payments, clientToday);
      setAmountDue(currentBalance);

      if (isTenantCurrentlyDueForRent(selectedTenant, payments, clientToday)) {
        setRentStatusMessage("Rent is due for the current period");
      } else {
        setRentStatusMessage(null);
      }

    } else {
      setAmountDue(null); 
      setRentStatusMessage(null);
    }
  }, [selectedTenant, payments, clientToday, tenants]); 

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
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <TenantsListForPayments 
              onSelectTenant={handleSelectTenant} 
              searchTerm={searchTerm} 
              selectedTenantId={selectedTenant?.id}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-lg min-h-[300px] flex flex-col">
          <CardHeader>
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <CardTitle className="font-headline text-lg">
                    {selectedTenant ? `Payment History for ${selectedTenant.name}` : "Payment History"}
                  </CardTitle>
                </div>
                {selectedTenant && (
                  <Button onClick={() => handleOpenForm()} size="sm" className="shadow-sm">
                      <DollarSign className="mr-2 h-4 w-4" />
                      Pay
                  </Button>
                )}
            </div>
            <CardDescription className="text-xs">
              {selectedTenant ? `Showing all payments for ${selectedTenant.name}.` : "Select a tenant from the list to view their payments."}
            </CardDescription>
            {selectedTenant && amountDue !== null && clientToday && (
              <div className="mt-3 p-3 border rounded-md bg-muted/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {amountDue > 0 && <DollarSign className="h-5 w-5 text-destructive" />}
                    {amountDue < 0 && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                    {amountDue === 0 && <DollarSign className="h-5 w-5 text-muted-foreground" />}
                    <span className="font-semibold text-md">
                      {amountDue > 0 ? "Current Amount Due:" : amountDue < 0 ? "Current Credit/Deposit:" : "Current Balance:"}
                    </span>
                  </div>
                  <span className={cn("font-bold text-lg", 
                        amountDue > 0 ? "text-destructive" : 
                        amountDue < 0 ? "text-green-600" : "text-foreground")}>
                    ₱{Math.abs(amountDue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                {rentStatusMessage && amountDue > 0 && (
                   <div className="flex items-center justify-start">
                     <Badge variant="outline" className="bg-orange-500/20 text-orange-700 border-orange-500">
                        <CalendarClock className="h-3 w-3 mr-1" />
                        {rentStatusMessage}
                    </Badge>
                   </div>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent className="flex-grow">
            <PaymentsTable 
              tenantId={selectedTenant?.id} 
              onEdit={handleOpenForm}
              onDelete={handleDeletePayment}
            />
          </CardContent>
        </Card>
      </div>
      
      {isFormOpen && (
        <PaymentForm
            isOpen={isFormOpen}
            onClose={handleCloseForm}
            defaultTenantId={selectedTenant?.id}
            payment={editingPayment}
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
