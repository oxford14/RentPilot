
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PaymentForm } from '@/components/payments/PaymentForm';
import { PaymentsTable } from '@/components/payments/PaymentsTable';
import { TenantsListForPayments } from '@/components/payments/TenantsListForPayments';
import type { Tenant } from '@/lib/types';
import { PlusCircle, Search, UserSearch, FileText, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function PaymentsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  const handleOpenForm = () => setIsFormOpen(true);
  const handleCloseForm = () => setIsFormOpen(false);

  const handleSelectTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
  };

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
          <CardContent className="p-0"> {/* Remove padding for table to fit nicely */}
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
