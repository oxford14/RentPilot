
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
import { Home, Server, User, Trash2, AlertTriangle, UserCheck, Wifi, Lan, Camera, Headphones, BedDouble } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import type { PcIssue, PcSubIssue } from '@/lib/types';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CustomCheckbox } from '@/components/ui/custom-checkbox';

const issueSubComponents = {
  Monitor: ['Adapter', 'Power Cable', 'HDMI'],
  'System Unit': ['RAM', 'Hard Drive', 'Motherboard', 'Wifi adapter', 'LAN'],
};
const issueMainComponents = ['Monitor', 'Keyboard', 'Mouse', 'UPS', 'System Unit', 'Camera', 'Headphones'] as const;

const issueDetailSchema = z.object({
  hasIssue: z.boolean().optional(),
  notes: z.string().optional(),
});

const subComponentSchema = z.object({
    Adapter: issueDetailSchema.optional(),
    'Power Cable': issueDetailSchema.optional(),
    HDMI: issueDetailSchema.optional(),
    RAM: issueDetailSchema.optional(),
    'Hard Drive': issueDetailSchema.optional(),
    Motherboard: issueDetailSchema.optional(),
    'Wifi adapter': issueDetailSchema.optional(),
    LAN: issueDetailSchema.optional(),
});

const issueFormSchema = z.object({
  issues: z.object({
    Monitor: issueDetailSchema.extend({ subIssues: subComponentSchema.optional() }).optional(),
    Keyboard: issueDetailSchema.optional(),
    Mouse: issueDetailSchema.optional(),
    UPS: issueDetailSchema.optional(),
    'System Unit': issueDetailSchema.extend({ subIssues: subComponentSchema.optional() }).optional(),
    Camera: issueDetailSchema.optional(),
    Headphones: issueDetailSchema.optional(),
  }),
  otherNotes: z.string().optional(),
});

type IssueFormValues = z.infer<typeof issueFormSchema>;


export default function RoomManagementPage() {
  const { clients, tenants, updateClientRoomCount, assignTenantToRoom, unassignTenantFromRoom, updateClientRoomIssue, updateClientRoomCapacity, viewingAsClientId } = useAppContext();
  const { user } = useAuth();

  const client = useMemo(() => {
    const currentContextClientId = user?.isSuperAdmin ? viewingAsClientId : user?.clientId;
    if (!currentContextClientId) return null;
    return clients.find(c => c.id === currentContextClientId);
  }, [clients, user, viewingAsClientId]);

  const [roomCountInput, setRoomCountInput] = useState('');
  
  const [isIssueDialogOpen, setIsIssueDialogOpen] = useState(false);
  const [selectedRoomNumber, setSelectedRoomNumber] = useState<number | null>(null);
  
  const canConfigureRoomCount = user?.isSuperAdmin || user?.role === 'admin';

  const form = useForm<IssueFormValues>({
    resolver: zodResolver(issueFormSchema),
  });
  
  useEffect(() => {
    if (client) {
      setRoomCountInput(String(client.roomCount || 0));
    }
  }, [client]);
  
  const watchedMonitorSubIssues = issueSubComponents.Monitor.map(sub => form.watch(`issues.Monitor.subIssues.${sub}.hasIssue`));
  useEffect(() => {
    if (watchedMonitorSubIssues.some(isChecked => isChecked)) {
      if (!form.getValues('issues.Monitor.hasIssue')) {
        form.setValue('issues.Monitor.hasIssue', true, { shouldValidate: true });
      }
    }
  }, [watchedMonitorSubIssues, form]);
  
  const watchedSystemUnitSubIssues = issueSubComponents['System Unit'].map(sub => form.watch(`issues.System Unit.subIssues.${sub}.hasIssue`));
  useEffect(() => {
    if (watchedSystemUnitSubIssues.some(isChecked => isChecked)) {
      if (!form.getValues('issues.System Unit.hasIssue')) {
        form.setValue('issues.System Unit.hasIssue', true, { shouldValidate: true });
      }
    }
  }, [watchedSystemUnitSubIssues, form]);


  // Auto-uncheck children when parent is unchecked
  const watchedMonitorHasIssue = form.watch('issues.Monitor.hasIssue');
  useEffect(() => {
      if (watchedMonitorHasIssue === false) {
          const subIssueKeys = issueSubComponents.Monitor;
          subIssueKeys.forEach(key => {
              form.setValue(`issues.Monitor.subIssues.${key}.hasIssue`, false);
              form.setValue(`issues.Monitor.subIssues.${key}.notes`, '');
          });
      }
  }, [watchedMonitorHasIssue, form]);

  const watchedSystemUnitHasIssue = form.watch('issues.System Unit.hasIssue');
  useEffect(() => {
      if (watchedSystemUnitHasIssue === false) {
          const subIssueKeys = issueSubComponents['System Unit'];
          subIssueKeys.forEach(key => {
              form.setValue(`issues.System Unit.subIssues.${key}.hasIssue`, false);
              form.setValue(`issues.System Unit.subIssues.${key}.notes`, '');
          });
      }
  }, [watchedSystemUnitHasIssue, form]);

  const handleSetRoomCount = () => {
    const count = parseInt(roomCountInput, 10);
    if (client && !isNaN(count) && count >= 0) {
      updateClientRoomCount(client.id, count);
    }
  };

  const rooms = useMemo(() => {
    const count = client?.roomCount || 0;
    return Array.from({ length: count }, (_, i) => {
      const roomNumber = i + 1;
      const occupants = tenants.filter(t => t.roomNumber === roomNumber);
      const capacity = client?.roomCapacities?.[roomNumber] ?? 1;
      return {
        number: roomNumber,
        occupants,
        capacity,
      };
    });
  }, [client?.roomCount, client?.roomCapacities, tenants]);
  
  const { occupiedBeds, freeBeds } = useMemo(() => {
    const totalBeds = rooms.reduce((sum, room) => sum + room.capacity, 0);
    const occupied = rooms.reduce((sum, room) => sum + room.occupants.length, 0);
    return { occupiedBeds: occupied, freeBeds: Math.max(0, totalBeds - occupied) };
  }, [rooms]);

  const availableTenants = useMemo(() => {
    return tenants.filter(t => t.status === 'active' && !t.roomNumber);
  }, [tenants]);
  
  const handleOpenIssueDialog = (roomNumber: number) => {
    const roomIssues = client?.roomIssues || {};
    const issueDataForRoom = roomIssues[roomNumber];
    const defaultValues: IssueFormValues = { issues: {}, otherNotes: '' };

    if (issueDataForRoom) {
        if (typeof issueDataForRoom.otherNotes === 'string') {
            defaultValues.otherNotes = issueDataForRoom.otherNotes;
        }

        issueMainComponents.forEach(component => {
            const issueDetail = issueDataForRoom[component as keyof typeof issueDataForRoom];
            
            if (issueDetail) {
                const hasIssue = !!issueDetail;
                const notes = (typeof issueDetail === 'object' && issueDetail !== null && 'notes' in issueDetail) ? issueDetail.notes || '' : '';

                defaultValues.issues[component] = {
                    hasIssue: hasIssue,
                    notes: notes,
                    subIssues: {},
                };
                
                const hasSubIssuesData = typeof issueDetail === 'object' && issueDetail !== null && 'subIssues' in issueDetail && !!issueDetail.subIssues;
                const subComponentsList = issueSubComponents[component as keyof typeof issueSubComponents];
                if (subComponentsList && hasSubIssuesData) {
                    subComponentsList.forEach(sub => {
                        const subIssueData = (issueDetail as any).subIssues[sub];
                        if (subIssueData) {
                            defaultValues.issues[component]!.subIssues![sub as keyof typeof subComponentSchema.shape] = {
                                hasIssue: true,
                                notes: typeof subIssueData === 'string' ? subIssueData : 'Issue reported',
                            };
                        }
                    });
                }
            }
        });
    }

    form.reset(defaultValues);
    setSelectedRoomNumber(roomNumber);
    setIsIssueDialogOpen(true);
  };
  
  const onIssueSubmit = async (data: IssueFormValues) => {
    if (!client || selectedRoomNumber === null) return;
    
    const newIssuesForRoom: PcIssue = {};
    
    (Object.keys(data.issues) as (keyof typeof data.issues)[]).forEach(mainComponentKey => {
      const mainIssueData = data.issues[mainComponentKey];
      if (!mainIssueData || !mainIssueData.hasIssue) return;

      const subIssuesToSave: PcSubIssue = {};
      let hasAnySubIssue = false;

      if (mainIssueData.subIssues) {
        (Object.keys(mainIssueData.subIssues) as (keyof typeof mainIssueData.subIssues)[]).forEach(subComponentKey => {
          const subIssueData = mainIssueData.subIssues![subComponentKey];
          if (subIssueData?.hasIssue) {
            subIssuesToSave[subComponentKey] = subIssueData.notes || 'Issue reported';
            hasAnySubIssue = true;
          }
        });
      }
      
      const newMainIssueEntry: { notes: string; subIssues?: PcSubIssue } = {
        notes: mainIssueData.notes || '',
      };
      
      if (hasAnySubIssue) {
        newMainIssueEntry.subIssues = subIssuesToSave;
      }
      
      newIssuesForRoom[mainComponentKey] = newMainIssueEntry;
    });
    
    if (data.otherNotes && data.otherNotes.trim()) {
      newIssuesForRoom.otherNotes = data.otherNotes.trim();
    }

    await updateClientRoomIssue(client.id, selectedRoomNumber, newIssuesForRoom);
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

  const allowedBusinessTypes: (string | undefined)[] = ['Standard', 'Vehicle_Rental'];
  if (!allowedBusinessTypes.includes(client.businessType)) {
      return (
          <div className="container mx-auto py-2">
              <Card>
                  <CardHeader>
                      <CardTitle>Access Denied</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <p>This feature is only available for Standard or Vehicle Rental business types.</p>
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
            <Home className="mr-3 h-8 w-8 text-primary" />
            Room Management
          </h1>
          <p className="text-muted-foreground">Configure and manage room assignments for your tenants.</p>
        </div>
        <div className="flex items-center gap-4">
            <Card className="p-4 shadow-md">
                <div className="flex items-center gap-3">
                    <UserCheck className="h-6 w-6 text-green-500"/>
                    <div>
                        <p className="text-sm text-muted-foreground">Occupied Beds</p>
                        <p className="text-2xl font-bold">{occupiedBeds}</p>
                    </div>
                </div>
            </Card>
            <Card className="p-4 shadow-md">
                <div className="flex items-center gap-3">
                    <Server className="h-6 w-6 text-gray-400"/>
                    <div>
                        <p className="text-sm text-muted-foreground">Free Beds</p>
                        <p className="text-2xl font-bold">{freeBeds}</p>
                    </div>
                </div>
            </Card>
        </div>
      </div>

      {canConfigureRoomCount && (
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Configure Total Rooms</CardTitle>
            <CardDescription>Set the total number of rooms available for assignment.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="room-count">Number of Rooms</Label>
                <Input
                  type="number"
                  id="room-count"
                  value={roomCountInput}
                  onChange={(e) => setRoomCountInput(e.target.value)}
                  min="0"
                />
              </div>
              <Button onClick={handleSetRoomCount}>Set Count</Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {rooms.map(room => {
          const issueObject = client?.roomIssues?.[room.number]
          const hasIssue = !!issueObject && Object.keys(issueObject).length > 0;
          const isFull = room.occupants.length >= room.capacity;
          return (
            <Card key={room.number} className="shadow-lg flex flex-col">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                    <Home className={cn("h-6 w-6", room.occupants.length > 0 ? "text-green-500" : "text-muted-foreground")} />
                    <div>
                      <CardTitle className="text-lg font-bold">Room {room.number}</CardTitle>
                      <p className="text-xs text-muted-foreground">{room.occupants.length} / {room.capacity} beds</p>
                    </div>
                </div>
                <Button
                    variant={hasIssue ? "destructive" : "ghost"}
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleOpenIssueDialog(room.number)}
                >
                    <AlertTriangle className="h-4 w-4" />
                    <span className="sr-only">Report Issue</span>
                </Button>
              </CardHeader>
              <CardContent className="flex-grow space-y-2">
                {room.occupants.length === 0 ? (
                  <div className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                     <User className="h-4 w-4"/>
                     <span>Vacant</span>
                  </div>
                ) : (
                  room.occupants.map(occupant => (
                    <div key={occupant.id} className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-2 py-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <User className="h-4 w-4 shrink-0 text-muted-foreground"/>
                        <span className="text-sm font-medium truncate">{occupant.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                        onClick={() => unassignTenantFromRoom(occupant.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Unassign {occupant.name}</span>
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
              <CardFooter className="flex-col items-stretch space-y-2">
                {isFull ? (
                  <div className="flex items-center justify-center rounded-md border border-dashed py-2 text-sm text-muted-foreground">
                    Room full
                  </div>
                ) : (
                  <Select
                    onValueChange={(tenantId) => assignTenantToRoom(tenantId, room.number)}
                    value=""
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Add a tenant..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTenants.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                      {availableTenants.length === 0 && (
                        <div className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 px-2 text-sm text-muted-foreground">
                            No available tenants
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                )}
                {canConfigureRoomCount && (
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`beds-${room.number}`} className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                      <BedDouble className="h-4 w-4" /> Beds
                    </Label>
                    <Input
                      id={`beds-${room.number}`}
                      type="number"
                      min={Math.max(1, room.occupants.length)}
                      defaultValue={room.capacity}
                      className="h-8"
                      onBlur={(e) => {
                        const n = parseInt(e.target.value, 10);
                        if (!isNaN(n) && n !== room.capacity) {
                          updateClientRoomCapacity(client.id, room.number, n);
                        }
                      }}
                    />
                  </div>
                )}
              </CardFooter>
            </Card>
          )}
        )}
      </div>
    </div>
    
    <Dialog open={isIssueDialogOpen} onOpenChange={setIsIssueDialogOpen}>
      <DialogContent className="sm:max-w-lg h-[90vh] flex flex-col fancy-dialog">
        <DialogHeader className="text-center p-6">
          <DialogTitle>Issue for Room {selectedRoomNumber}</DialogTitle>
          <DialogDescription>
            Select the components with issues and add notes.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onIssueSubmit)} className="flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="py-4 space-y-4">
                {issueMainComponents.map((componentName) => {
                  const subComponents = issueSubComponents[componentName as keyof typeof issueSubComponents];
                  const fieldId = `issues-${componentName.replace(/\s+/g, '-')}`;
                  const isParentChecked = form.watch(`issues.${componentName}.hasIssue`);
                  return (
                    <div key={componentName} className="space-y-2 p-3 border rounded-lg">
                      <FormField
                        control={form.control}
                        name={`issues.${componentName}.hasIssue`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                               <CustomCheckbox
                                id={fieldId}
                                label={componentName}
                                checked={!!field.value}
                                onCheckedChange={field.onChange}
                               />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      {(isParentChecked) && (
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
                      {subComponents && isParentChecked && (
                        <div className="pl-7 mt-2 space-y-2">
                          {subComponents.map(subName => {
                             const subFieldId = `${fieldId}-${subName.replace(/\s+/g, '-')}`;
                             const isSubChecked = form.watch(`issues.${componentName}.subIssues.${subName}.hasIssue`);
                            return (
                              <div key={subName} className="space-y-2 ml-4">
                                <FormField
                                  control={form.control}
                                  name={`issues.${componentName}.subIssues.${subName}.hasIssue`}
                                  render={({ field }) => (
                                    <FormItem>
                                       <FormControl>
                                            <CustomCheckbox
                                                id={subFieldId}
                                                label={subName}
                                                checked={!!field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                       </FormControl>
                                    </FormItem>
                                  )}
                                />
                                {isSubChecked && (
                                  <FormField
                                    control={form.control}
                                    name={`issues.${componentName}.subIssues.${subName}.notes`}
                                    render={({ field }) => (
                                      <FormItem className="pl-6">
                                        <FormControl>
                                          <Input placeholder={`Notes for ${subName}...`} {...field} />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                )}
                              </div>
                            )
                          })}
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
            </ScrollArea>
            <DialogFooter className="pt-4 mt-auto border-t">
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
