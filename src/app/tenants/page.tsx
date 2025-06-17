
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TenantForm } from '@/components/tenants/TenantForm';
import { TenantsTable } from '@/components/tenants/TenantsTable';
import type { Tenant } from '@/lib/types';
import { PlusCircle, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function TenantsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [showInactiveTenants, setShowInactiveTenants] = useState(true);

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
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-bold font-headline">Tenant Management</CardTitle>
              <CardDescription>Add, edit, and manage your tenant profiles.</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 w-full sm:w-auto">
                <div className="flex items-center space-x-2 pt-2 sm:pt-0">
                    {showInactiveTenants ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                    <Label htmlFor="show-inactive-tenants" className="text-sm whitespace-nowrap">
                        {showInactiveTenants ? "Showing Inactive" : "Hiding Inactive"}
                    </Label>
                    <Switch
                        id="show-inactive-tenants"
                        checked={showInactiveTenants}
                        onCheckedChange={setShowInactiveTenants}
                        aria-label="Toggle visibility of inactive tenants"
                    />
                </div>
                <Button onClick={() => handleOpenForm()} variant="default" className="shadow-md hover:shadow-lg transition-shadow w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-5 w-5" /> Add New Tenant
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <TenantsTable onEditTenant={handleOpenForm} showInactiveTenants={showInactiveTenants} />
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
