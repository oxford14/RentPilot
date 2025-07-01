
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppContext } from '@/contexts/AppContext';
import type { Tenant, AdditionalDue } from '@/lib/types';
import { PlusCircle, UserSearch, ListPlus, FileWarning, Wallet } from 'lucide-react';
import { AdditionalDueForm } from '@/components/additional-dues/AdditionalDueForm';
import { AdditionalDuesTable } from '@/components/additional-dues/AdditionalDuesTable';
import { calculateTenantBalance } from '@/lib/utils';
import { startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';


export default function AdditionalDuesPage() {
  const { tenants, deleteAdditionalDue, updateAdditionalDue, payments, additionalDues } = useAppContext();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDue, setEditingDue] = useState<AdditionalDue | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string | undefined>(undefined);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [clientToday, setClientToday] = useState<Date | null>(null);

  useEffect(() => {
    setClientToday(startOfDay(new Date()));
  }, []);

  const activeTenants = useMemo(() => tenants.filter(t => t.status === 'active'), [tenants]);
  
  const selectedTenant = useMemo(() => {
    if (!selectedTenantId) return null;
    return tenants.find(t => t.id === selectedTenantId);
  }, [selectedTenantId, tenants]);

  useEffect(() => {
    if (selectedTenant && clientToday) {
      const balance = calculateTenantBalance(selectedTenant, payments, additionalDues, clientToday);
      setCurrentBalance(balance);
    } else {
      setCurrentBalance(0);
    }
  }, [selectedTenant, payments, additionalDues, clientToday, isFormOpen]);

  const handleOpenForm = (due?: AdditionalDue) => {
    setEditingDue(due || null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setEditingDue(null);
    setIsFormOpen(false);
  };
  
  const handleTenantChange = (tenantId: string) => {
    setSelectedTenantId(tenantId);
  }
  
  const balanceColor = currentBalance > 0 ? "text-destructive" : (currentBalance < 0 ? "text-green-600" : "text-foreground");
  const balanceText = currentBalance > 0 ? "Amount Due:" : (currentBalance < 0 ? "Credit:" : "Balance:");

  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold font-headline flex items-center">
            <ListPlus className="mr-3 h-8 w-8 text-primary" />
            Additional Dues
          </h1>
          <p className="text-muted-foreground">Track and manage additional charges for tenants like utility bills.</p>
        </div>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserSearch className="mr-2 h-5 w-5 text-primary" />
            Select a Tenant
          </CardTitle>
          <CardDescription>Choose a tenant to view or add additional dues.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-center">
                <Select onValueChange={handleTenantChange} value={selectedTenantId}>
                    <SelectTrigger className="w-full sm:w-[300px]">
                        <SelectValue placeholder="Choose a tenant..." />
                    </SelectTrigger>
                    <SelectContent>
                        {activeTenants.map(tenant => (
                        <SelectItem key={tenant.id} value={tenant.id}>
                            {tenant.name}
                        </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                 <Button onClick={() => handleOpenForm()} disabled={!selectedTenantId} className="w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-5 w-5" /> Add New Charge
                </Button>
            </div>
        </CardContent>
      </Card>
      
      {selectedTenantId ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="shadow-xl lg:col-span-2">
              <CardHeader>
                  <CardTitle>Dues for {tenants.find(t=>t.id === selectedTenantId)?.name}</CardTitle>
                  <CardDescription>
                      List of all additional charges. Unpaid dues are added to the tenant's total balance.
                  </CardDescription>
              </CardHeader>
              <CardContent>
                  <AdditionalDuesTable 
                      tenantId={selectedTenantId}
                      onEdit={handleOpenForm}
                      onDelete={deleteAdditionalDue}
                      onUpdateStatus={updateAdditionalDue}
                  />
              </CardContent>
          </Card>
          <Card className="shadow-xl lg:col-span-1 h-fit">
              <CardHeader>
                  <CardTitle className="flex items-center">
                      <Wallet className="mr-2 h-5 w-5 text-primary"/>
                      Tenant Balance
                  </CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="flex justify-between items-center text-lg p-4 bg-muted rounded-lg">
                      <span className="font-medium">{balanceText}</span>
                      <span className={cn("font-bold text-xl", balanceColor)}>
                        ₱{Math.abs(currentBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                  </div>
                   <p className="text-xs text-muted-foreground mt-2">This is the tenant's total current balance including rent and all dues.</p>
              </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg">
            <FileWarning className="mx-auto h-12 w-12 mb-4 text-gray-400" />
            <p className="text-lg font-medium">No Tenant Selected</p>
            <p className="text-sm">Please select a tenant from the dropdown above to manage their dues.</p>
        </div>
      )}

      {isFormOpen && selectedTenantId && (
        <AdditionalDueForm
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          due={editingDue}
          tenantId={selectedTenantId}
        />
      )}
    </div>
  );
}

