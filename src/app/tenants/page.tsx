
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TenantForm } from '@/components/tenants/TenantForm';
import { TenantsTable } from '@/components/tenants/TenantsTable';
import type { Tenant } from '@/lib/types';
import { PlusCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function TenantsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  const handleOpenForm = (tenant?: Tenant) => {
    setEditingTenant(tenant || null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setEditingTenant(null);
    setIsFormOpen(false);
  };

  return (
    <div className="container mx-auto py-2 space-y-6">
      <Card className="shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold font-headline">Tenant Management</CardTitle>
            <CardDescription>Add, edit, and manage your tenant profiles.</CardDescription>
          </div>
          <Button onClick={() => handleOpenForm()} variant="default" className="shadow-md hover:shadow-lg transition-shadow">
            <PlusCircle className="mr-2 h-5 w-5" /> Add New Tenant
          </Button>
        </CardHeader>
        <CardContent>
          <TenantsTable onEditTenant={handleOpenForm} />
        </CardContent>
      </Card>

      {isFormOpen && (
         <TenantForm
            isOpen={isFormOpen}
            onClose={handleCloseForm}
            tenant={editingTenant}
          />
      )}
    </div>
  );
}
