

"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
import type { PcIssue, PcSubIssue } from '@/lib/types';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';

const issueSubComponents = {
  Monitor: ['Adapter', 'Power Cable'],
  'System Unit': ['RAM', 'Hard Drive', 'Motherboard', 'Wifi adapter', 'LAN'],
};
const issueMainComponents = ['Monitor', 'Keyboard', 'Mouse', 'UPS', 'System Unit', 'Camera', 'Headphones'] as const;

const issueDetailSchema = z.object({
  hasIssue: z.boolean(),
  notes: z.string().optional(),
});

const subComponentSchema = z.object({
    Adapter: issueDetailSchema.optional(),
    'Power Cable': issueDetailSchema.optional(),
    RAM: issueDetailSchema.optional(),
    'Hard Drive': issueDetailSchema.optional(),
    Motherboard: issueDetailSchema.optional(),
    'Wifi adapter': issueDetailSchema.optional(),
    LAN: issueDetailSchema.optional(),
});

const issueFormSchema = z.object({
  issues: z.object({
    Monitor: issueDetailSchema.extend({ subIssues: subComponentSchema.optional() }),
    Keyboard: issueDetailSchema,
    Mouse: issueDetailSchema,
    UPS: issueDetailSchema,
    'System Unit': issueDetailSchema.extend({ subIssues: subComponentSchema.optional() }),
    Camera: issueDetailSchema,
    Headphones: issueDetailSchema,
  }),
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
    const pcIssues = client?.pcIssues || {};
    const issueData = pcIssues[pcNumber];
    
    let defaultValues: Partial<IssueFormValues['issues']> = {};

    if (typeof issueData === 'string') {
      form.reset({ otherNotes: issueData });
    } else {
        issueMainComponents.forEach(component => {
            const currentIssue = issueData?.[component];
            const hasSubIssues = issueSubComponents[component as keyof typeof issueSubComponents];

            if (hasSubIssues) {
                const subIssuesDefault: Record<string, { hasIssue: boolean; notes?: string }> = {};
                hasSubIssues.forEach(sub => {
                    subIssuesDefault[sub] = {
                        hasIssue: !!currentIssue?.subIssues?.[sub],
                        notes: currentIssue?.subIssues?.[sub] || '',
                    };
                });
                 defaultValues[component] = {
                    hasIssue: !!currentIssue?.notes,
                    notes: currentIssue?.notes || '',
                    subIssues: subIssuesDefault as any,
                };
            } else {
                defaultValues[component] = {
                    hasIssue: !!currentIssue?.notes,
                    notes: currentIssue?.notes || '',
                };
            }
        });
        form.reset({
            issues: defaultValues as IssueFormValues['issues'],
            otherNotes: issueData?.otherNotes || '',
        });
    }

    setSelectedPcNumber(pcNumber);
    setIsIssueDialogOpen(true);
  };


  const onIssueSubmit = async (data: IssueFormValues) => {
    if (!client || selectedPcNumber === null) return;
    
    const newIssues: PcIssue = {};
    
    (Object.keys(data.issues) as (keyof typeof data.issues)[]).forEach(mainComponent => {
        const issue = data.issues[mainComponent];
        if (issue && (issue.hasIssue || (issue.subIssues && Object.values(issue.subIssues).some(si => si?.hasIssue)))) {
            newIssues[mainComponent] = {
                notes: issue.notes || '',
                subIssues: {}
            };
            if (issue.subIssues) {
                (Object.keys(issue.subIssues) as (keyof typeof issue.subIssues)[]).forEach(subComponent => {
                    const subIssue = issue.subIssues![subComponent];
                    if (subIssue?.hasIssue) {
                        newIssues[mainComponent]!.subIssues![subComponent] = subIssue.notes || 'Issue reported';
                    }
                });
            }
        }
    });

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
          const hasIssue = (typeof issueObject === 'string' && issueObject.length > 0) || (typeof issueObject === 'object' && issueObject !== null && Object.keys(issueObject).length > 0);
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
                {issueMainComponents.map((componentName) => {
                  const subComponents = issueSubComponents[componentName as keyof typeof issueSubComponents];
                  return (
                    <div key={componentName} className="space-y-2 p-3 border rounded-lg">
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
                      {subComponents && (
                        <div className="pl-6 space-y-2 mt-2">
                            {subComponents.map(subName => (
                                <div key={subName} className="space-y-2">
                                    <FormField
                                        control={form.control}
                                        name={`issues.${componentName}.subIssues.${subName}.hasIssue`}
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                                <FormControl>
                                                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                                </FormControl>
                                                <FormLabel className="font-normal text-sm">{subName}</FormLabel>
                                            </FormItem>
                                        )}
                                    />
                                    {form.watch(`issues.${componentName}.subIssues.${subName}.hasIssue`) && (
                                        <FormField
                                            control={form.control}
                                            name={`issues.${componentName}.subIssues.${subName}.notes`}
                                            render={({ field }) => (
                                                <FormItem className="pl-7">
                                                    <FormControl>
                                                        <Input placeholder={`Notes for ${subName}...`} {...field} />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                      )}
                    </div>
                  );
                })}
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
