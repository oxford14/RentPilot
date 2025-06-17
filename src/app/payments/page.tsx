
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
import { format, startOfDay, getDate, getMonth, getYear, lastDayOfMonth, setDate, isBefore, isSameDay } from 'date-fns';
import { isTenantCurrentlyDueForRent } from '@/lib/utils';

export default function PaymentsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [amountDue, setAmountDue] = useState<number | null>(null); 
  const [rentStatusMessage, setRentStatusMessage] = useState<string | null>(null);
  const { payments, tenants } = useAppContext(); 
  const [clientToday, setClientToday] = useState<Date | null>(null);

  useEffect(() => {
    setClientToday(new Date());
  }, []);

  const handleOpenForm = () => setIsFormOpen(true);
  const handleCloseForm = () => setIsFormOpen(false);

  const handleSelectTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
  };

  useEffect(() => {
    if (selectedTenant && clientToday) {
      const tenantPayments = payments.filter(p => p.tenantId === selectedTenant.id);
      const totalPaid = tenantPayments.reduce((sum, p) => sum + p.amount, 0);

      let totalExpectedBilled = 0;
      const tenantJoinDate = new Date(selectedTenant.joinDate);
      const todayForCalc = new Date(clientToday); 
      todayForCalc.setHours(0,0,0,0); 

      if (tenantJoinDate <= todayForCalc) {
          totalExpectedBilled += selectedTenant.monthlyRentalRate;
          
          let nextBillingAnniversary = new Date(tenantJoinDate.getFullYear(), tenantJoinDate.getMonth(), tenantJoinDate.getDate());
          nextBillingAnniversary.setMonth(nextBillingAnniversary.getMonth() + 1); 

          while (nextBillingAnniversary <= todayForCalc) {
              totalExpectedBilled += selectedTenant.monthlyRentalRate;
              nextBillingAnniversary.setMonth(nextBillingAnniversary.getMonth() + 1);
          }
      }
      
      const currentBalance = totalExpectedBilled - totalPaid;
      setAmountDue(currentBalance);

      if (isTenantCurrentlyDueForRent(selectedTenant, payments, clientToday)) {
        setRentStatusMessage("Rent is due today");
      } else {
        setRentStatusMessage(null);
      }

    } else {
      setAmountDue(null); 
      setRentStatusMessage(null);
    }
  }, [selectedTenant, payments, clientToday]); // tenants removed as it's stable from context unless it changes structurally

  return (
    <div className="container mx-auto py-2 space-y-6">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-bold font-headline">Payment Tracking</CardTitle>
              <CardDescription>Select a tenant to view their payments or record a new one.</CardDescription>
            </div>
            <Button onClick={handleOpenForm} variant="default" className="shadow-md hover:shadow-lg transition-shadow w-full sm:w-auto">
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
             <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle className="font-headline text-lg">
                  {selectedTenant ? `Payment History for ${selectedTenant.name}` : "Payment History"}
                </CardTitle>
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
                      {amountDue > 0 ? "Amount Due:" : amountDue < 0 ? "Credit/Deposit:" : "Current Balance:"}
                    </span>
                  </div>
                  <span className={`font-bold text-lg ${
                    amountDue > 0 ? "text-destructive" : amountDue < 0 ? "text-green-600" : "text-foreground"
                  }`}>
                    ${Math.abs(amountDue).toLocaleString()}
                  </span>
                </div>
                {rentStatusMessage && (
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
            <PaymentsTable tenantId={selectedTenant?.id} />
          </CardContent>
        </Card>
      </div>
      
      {isFormOpen && (
        <PaymentForm
            isOpen={isFormOpen}
            onClose={handleCloseForm}
            defaultTenantId={selectedTenant?.id}
        />
      )}
    </div>
  );
}
