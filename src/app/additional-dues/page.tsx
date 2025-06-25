
"use client";

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppContext } from '@/contexts/AppContext';
import type { Tenant, AdditionalDue } from '@/lib/types';
import { PlusCircle, UserSearch, ListPlus, FileWarning } from 'lucide-react';
import { AdditionalDueForm } from '@/components/additional-dues/AdditionalDueForm';
import { AdditionalDuesTable } from '@/components/additional-dues/AdditionalDuesTable';

export default function AdditionalDuesPage() {
  const { tenants, deleteAdditionalDue, updateAdditionalDue } = useAppContext();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDue, setEditingDue] = useState<AdditionalDue | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string | undefined>(undefined);

  const activeTenants = useMemo(() => tenants.filter(t => t.status === 'active'), [tenants]);

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
        <Card className="shadow-xl">
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
