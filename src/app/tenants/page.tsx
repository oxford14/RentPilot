
"use client";

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { TenantForm } from '@/components/tenants/TenantForm';
import { TenantsTable } from '@/components/tenants/TenantsTable';
import type { Tenant } from '@/lib/types';
import { PlusCircle, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { getPlanDefinition } from '@/lib/subscription-plans';
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
import Link from 'next/link';

export default function TenantsPage() {
  const { terminology, tenants, clients, viewingAsClientId, activeClient } = useAppContext();
  const { user } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [showInactiveTenants, setShowInactiveTenants] = useState(false);
  const [isUpgradeAlertOpen, setIsUpgradeAlertOpen] = useState(false);

  const currentClientId = user?.isSuperAdmin ? viewingAsClientId : user?.clientId;

  const client = useMemo(() => {
    if (!currentClientId) return null;
    return clients.find(c => c.id === currentClientId);
  }, [clients, currentClientId]);

  const clientTenants = useMemo(() => {
    if (!currentClientId) return [];
    // Important: only filter active tenants for the count against the limit.
    return tenants.filter(t => t.clientId === currentClientId && t.status === 'active');
  }, [tenants, currentClientId]);

  const tenantLimit = useMemo(() => {
    if (!client || !client.subscriptionPlanName) return Infinity; // Default to allow if no plan
    const def = getPlanDefinition(client.subscriptionPlanName);
    if (!def) return Infinity; // Custom / unknown plans are uncapped
    return def.tenantLimit ?? Infinity; // null => uncapped (Enterprise)
  }, [client]);

  const isLimitReached = clientTenants.length >= tenantLimit;


  const handleOpenForm = (tenant?: Tenant) => {
    // If adding a new tenant (not editing) and the limit is reached
    if (!tenant && isLimitReached) {
      setIsUpgradeAlertOpen(true);
      return;
    }
    setEditingTenant(tenant || null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setEditingTenant(null);
    setIsFormOpen(false);
  };

  const isVehicleRental = activeClient?.businessType === 'Vehicle_Rental';
  const pageTitle = isVehicleRental ? 'Renters Data' : `${terminology.plural} Management`;
  const pageDescription = isVehicleRental
    ? 'Save and manage renter contact profiles. Use Booking to schedule rentals.'
    : `Add, edit, and manage your ${terminology.plural.toLowerCase()} profiles.`;

  return (
    <div className="container mx-auto py-2 space-y-6">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-bold font-headline">{pageTitle}</CardTitle>
              <CardDescription>{pageDescription}</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 w-full sm:w-auto">
                <div className="flex items-center space-x-2 pt-2 sm:pt-0">
                    {showInactiveTenants ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                    <Label htmlFor="show-inactive-tenants" className="text-sm whitespace-nowrap">
                        {showInactiveTenants ? "Showing Inactive" : "Showing Active"}
                    </Label>
                    <Switch
                        id="show-inactive-tenants"
                        checked={showInactiveTenants}
                        onCheckedChange={setShowInactiveTenants}
                        aria-label={`Toggle between active and inactive ${terminology.plural.toLowerCase()}`}
                    />
                </div>
                <Button onClick={() => handleOpenForm()} variant="default" className="shadow-md hover:shadow-lg transition-shadow w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-5 w-5" /> Add New {terminology.single}
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

      <AlertDialog open={isUpgradeAlertOpen} onOpenChange={setIsUpgradeAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tenant Limit Reached</AlertDialogTitle>
            <AlertDialogDescription>
              You have reached the maximum of {tenantLimit} active tenants for your '{client?.subscriptionPlanName || 'current'}' plan. Please upgrade your subscription to add more tenants.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Link href="/subscription">Upgrade Plan</Link>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
