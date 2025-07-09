"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Monitor, Server, User, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export default function PcManagementPage() {
  const { clients, tenants, updateClientPcCount, assignTenantToPc, unassignTenantFromPc } = useAppContext();
  const { user } = useAuth();

  const client = useMemo(() => {
    if (!user?.clientId) return null;
    return clients.find(c => c.id === user.clientId);
  }, [clients, user]);

  const [pcCountInput, setPcCountInput] = useState('');
  
  const canConfigurePcCount = user?.isSuperAdmin || user?.role === 'admin';

  useEffect(() => {
    if (client) {
      setPcCountInput(String(client.pcCount || 0));
    }
  }, [client]);
  
  const handleSetPcCount = () => {
    const count = parseInt(pcCountInput, 10);
    if (client && !isNaN(count) && count >= 0) {
      updateClientPcCount(client.id, count);
    }
  };

  const pcs = useMemo(() => {
    const count = client?.pcCount || 0;
    return Array.from({ length: count }, (_, i) => {
      const pcNumber = i + 1;
      const assignedTenant = tenants.find(t => t.pcNumber === pcNumber);
      return {
        number: pcNumber,
        tenant: assignedTenant,
      };
    });
  }, [client?.pcCount, tenants]);

  const availableTenants = useMemo(() => {
    return tenants.filter(t => t.status === 'active' && !t.pcNumber);
  }, [tenants]);
  
  if (!client) {
    return (
      <div className="container mx-auto py-2">
        <Skeleton className="h-12 w-1/2 mb-4" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (client.name !== 'i-VirtuaTech') {
      return (
          <div className="container mx-auto py-2">
              <Card>
                  <CardHeader>
                      <CardTitle>Access Denied</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <p>This feature is only available for the i-VirtuaTech client.</p>
                  </CardContent>
              </Card>
          </div>
      );
  }

  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold font-headline flex items-center">
            <Monitor className="mr-3 h-8 w-8 text-primary" />
            PC Management
          </h1>
          <p className="text-muted-foreground">Configure and manage PC assignments for your tenants.</p>
        </div>
      </div>

      {canConfigurePcCount && (
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Configure Total PCs</CardTitle>
            <CardDescription>Set the total number of PCs available for assignment.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="pc-count">Number of PCs</Label>
                <Input
                  type="number"
                  id="pc-count"
                  value={pcCountInput}
                  onChange={(e) => setPcCountInput(e.target.value)}
                  min="0"
                />
              </div>
              <Button onClick={handleSetPcCount}>Set Count</Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {pcs.map(pc => (
          <Card key={pc.number} className="shadow-lg flex flex-col">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-bold">PC {pc.number}</CardTitle>
              <Server className={cn("h-6 w-6", pc.tenant ? "text-green-500" : "text-muted-foreground")} />
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="text-sm font-medium flex items-center gap-2">
                 <User className="h-4 w-4 text-muted-foreground"/> 
                 <span>{pc.tenant?.name || "Vacant"}</span>
              </div>
            </CardContent>
            <CardFooter className="flex-col items-stretch space-y-2">
              <Select
                onValueChange={(tenantId) => assignTenantToPc(tenantId, pc.number)}
                value={pc.tenant?.id || ''}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Assign a tenant..." />
                </SelectTrigger>
                <SelectContent>
                  {pc.tenant && <SelectItem value={pc.tenant.id}>{pc.tenant.name}</SelectItem>}
                  {availableTenants.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                  {availableTenants.length === 0 && !pc.tenant && (
                    <div className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 px-2 text-sm text-muted-foreground">
                        No available tenants
                    </div>
                  )}
                </SelectContent>
              </Select>
              {pc.tenant && (
                <Button variant="outline" size="sm" onClick={() => unassignTenantFromPc(pc.tenant!.id)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Unassign
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}