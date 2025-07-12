

"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Monitor, Server, User, Trash2, AlertTriangle, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import type { PcIssue } from '@/lib/types';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';

const issueComponents = ['Monitor', 'Keyboard', 'Mouse', 'UPS', 'System Unit'] as const;

const issueFormSchema = z.object({
  issues: z.object(
    issueComponents.reduce((acc, component) => {
      acc[component] = z.object({
        hasIssue: z.boolean(),
        notes: z.string().optional(),
      });
      return acc;
    }, {} as Record<typeof issueComponents[number], z.ZodObject<{ hasIssue: z.ZodBoolean, notes: z.ZodOptional<z.ZodString> }>>)
  ),
  otherNotes: z.string().optional(),
});

type IssueFormValues = z.infer<typeof issueFormSchema>;

export default function PcManagementPage() {
  const { clients, tenants, updateClientPcCount, assignTenantToPc, unassignTenantFromPc, updateClientPcIssue, viewingAsClientId } = useAppContext();
  const { user } = useAuth();

  const client = useMemo(() => {
    const currentContextClientId = user?.isSuperAdmin ? viewingAsClientId : user?.clientId;
    if (!currentContextClientId) return null;
    return clients.find(c => c.id === currentContextClientId);
  }, [clients, user, viewingAsClientId]);

  const [pcCountInput, setPcCountInput] = useState('');
  
  const [isIssueDialogOpen, setIsIssueDialogOpen] = useState(false);
  const [selectedPcNumber, setSelectedPcNumber] = useState<number | null>(null);
  
  const canConfigurePcCount = user?.isSuperAdmin || user?.role === 'admin';

  const form = useForm<IssueFormValues>({
    resolver: zodResolver(issueFormSchema),
  });
  
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
  
  const { occupiedCount, vacantCount } = useMemo(() => {
    const occupied = pcs.filter(pc => !!pc.tenant).length;
    const vacant = pcs.length - occupied;
    return { occupiedCount: occupied, vacantCount: vacant };
  }, [pcs]);

  const availableTenants = useMemo(() => {
    return tenants.filter(t => t.status === 'active' && !t.pcNumber);
  }, [tenants]);
  
  const handleOpenIssueDialog = (pcNumber: number) => {
    const currentIssues = client?.pcIssues?.[pcNumber] || {};
    const defaultValues: IssueFormValues = {
      issues: {
        'Monitor': { hasIssue: !!currentIssues['Monitor'], notes: currentIssues['Monitor'] || '' },
        'Keyboard': { hasIssue: !!currentIssues['Keyboard'], notes: currentIssues['Keyboard'] || '' },
        'Mouse': { hasIssue: !!currentIssues['Mouse'], notes: currentIssues['Mouse'] || '' },
        'UPS': { hasIssue: !!currentIssues['UPS'], notes: currentIssues['UPS'] || '' },
        'System Unit': { hasIssue: !!currentIssues['System Unit'], notes: currentIssues['System Unit'] || '' },
      },
      otherNotes: currentIssues['otherNotes'] || '',
    };
    form.reset(defaultValues);
    setSelectedPcNumber(pcNumber);
    setIsIssueDialogOpen(true);
  };

  const onIssueSubmit = async (data: IssueFormValues) => {
    if (!client || selectedPcNumber === null) return;
    
    const newIssues: PcIssue = {};
    for (const component of issueComponents) {
        if(data.issues[component].hasIssue) {
            newIssues[component] = data.issues[component].notes || 'Issue reported';
        }
    }
    if (data.otherNotes) {
        newIssues['otherNotes'] = data.otherNotes;
    }

    await updateClientPcIssue(client.id, selectedPcNumber, newIssues);
    setIsIssueDialogOpen(false);
  };


  if (!client) {
    return (
      <div className="container mx-auto py-2">
        <Skeleton className="h-12 w-1/2 mb-4" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  const allowedBusinessTypes: (string | undefined)[] = ['PC_Rental', 'ISP_Subscription'];
  if (!allowedBusinessTypes.includes(client.businessType)) {
      return (
          <div className="container mx-auto py-2">
              <Card>
                  <CardHeader>
                      <CardTitle>Access Denied</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <p>This feature is only available for PC Rental or ISP Subscription business types.</p>
                  </CardContent>
              </Card>
          </div>
      );
  }

  return (
    <>
    <div className="container mx-auto py-2 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold font-headline flex items-center">
            <Monitor className="mr-3 h-8 w-8 text-primary" />
            PC Management
          </h1>
          <p className="text-muted-foreground">Configure and manage PC assignments for your tenants.</p>
        </div>
        <div className="flex items-center gap-4">
            <Card className="p-4 shadow-md">
                <div className="flex items-center gap-3">
                    <UserCheck className="h-6 w-6 text-green-500"/>
                    <div>
                        <p className="text-sm text-muted-foreground">Occupied</p>
                        <p className="text-2xl font-bold">{occupiedCount}</p>
                    </div>
                </div>
            </Card>
            <Card className="p-4 shadow-md">
                <div className="flex items-center gap-3">
                    <Server className="h-6 w-6 text-gray-400"/>
                    <div>
                        <p className="text-sm text-muted-foreground">Vacant</p>
                        <p className="text-2xl font-bold">{vacantCount}</p>
                    </div>
                </div>
            </Card>
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
        {pcs.map(pc => {
          const issueObject = client?.pcIssues?.[pc.number]
          const hasIssue = !!issueObject && Object.keys(issueObject).length > 0;
          return (
            <Card key={pc.number} className="shadow-lg flex flex-col">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                    <Server className={cn("h-6 w-6", pc.tenant ? "text-green-500" : "text-muted-foreground")} />
                    <CardTitle className="text-lg font-bold">PC {pc.number}</CardTitle>
                </div>
                <Button
                    variant={hasIssue ? "destructive" : "ghost"}
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleOpenIssueDialog(pc.number)}
                >
                    <AlertTriangle className="h-4 w-4" />
                    <span className="sr-only">Report Issue</span>
                </Button>
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
          )}
        )}
      </div>
    </div>
    
    <Dialog open={isIssueDialogOpen} onOpenChange={setIsIssueDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onIssueSubmit)}>
              <DialogHeader>
                  <DialogTitle>Issue for PC {selectedPcNumber}</DialogTitle>
                  <DialogDescription>
                      Select the components with issues and add notes.
                  </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                {issueComponents.map((componentName) => (
                  <div key={componentName} className="space-y-2">
                    <FormField
                      control={form.control}
                      name={`issues.${componentName}.hasIssue`}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="font-semibold">{componentName}</FormLabel>
                        </FormItem>
                      )}
                    />
                    {form.watch(`issues.${componentName}.hasIssue`) && (
                      <FormField
                        control={form.control}
                        name={`issues.${componentName}.notes`}
                        render={({ field }) => (
                          <FormItem className="pl-6">
                            <FormControl>
                              <Input placeholder={`Notes for ${componentName}...`} {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                ))}
                <FormField
                  control={form.control}
                  name="otherNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Other / General Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Any other details..." {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsIssueDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">Save Issues</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
    </Dialog>
    </>
  );
}
