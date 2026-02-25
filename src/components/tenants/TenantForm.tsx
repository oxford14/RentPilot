
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { Tenant } from '@/lib/types';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const tenantFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email format." }),
  phone: z.string().min(1, { message: "Phone number is required." }),
  monthlyRentalRate: z.coerce.number().min(0, { message: "Rental rate must be a positive number." }),
  securityDeposit: z.coerce.number().min(0, { message: "Security deposit must be a positive number." }).optional(),
  status: z.enum(['active', 'inactive']),
  joinDate: z.string().refine((date) => date === '' || !isNaN(new Date(date).getTime()), { message: "Invalid date" }).refine(date => date !== '', { message: "Date is required." }),
  monthlyDueDay: z.coerce.number().min(1).max(31).optional().nullable(),
  rentAdjustmentDate: z.string().optional(),
  vehicleId: z.string().optional(),
  rentStartDate: z.string().optional(),
  rentEndDate: z.string().optional(),
});

type TenantFormValues = z.infer<typeof tenantFormSchema>;

interface TenantFormProps {
  isOpen: boolean;
  onClose: () => void;
  tenant?: Tenant | null;
}

export function TenantForm({ isOpen, onClose, tenant }: TenantFormProps) {
  const { addTenant, updateTenant, activeClient, vehicles, terminology } = useAppContext();
  const { toast } = useToast();
  const [initialRentRate, setInitialRentRate] = useState<number | null>(null);

  const isVehicleRental = activeClient?.businessType === 'Vehicle_Rental';

  const defaultValues = React.useMemo(() => {
    return tenant ? {
      ...tenant,
      email: tenant.email || '',
      phone: tenant.phone || '',
      securityDeposit: tenant.securityDeposit || 0,
      joinDate: tenant.joinDate ? new Date(tenant.joinDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      monthlyDueDay: tenant.monthlyDueDay || undefined,
      rentAdjustmentDate: undefined,
      vehicleId: tenant.vehicleId || 'none',
      rentStartDate: tenant.rentStartDate ? new Date(tenant.rentStartDate).toISOString().split('T')[0] : '',
      rentEndDate: tenant.rentEndDate ? new Date(tenant.rentEndDate).toISOString().split('T')[0] : '',
    } : {
      name: '',
      email: '',
      phone: '',
      monthlyRentalRate: 0,
      securityDeposit: 0,
      status: 'active' as 'active' | 'inactive',
      joinDate: new Date().toISOString().split('T')[0],
      monthlyDueDay: undefined,
      rentAdjustmentDate: undefined,
      vehicleId: 'none',
      rentStartDate: '',
      rentEndDate: '',
    };
  }, [tenant]);
  
  const form = useForm<TenantFormValues>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (isOpen) {
      form.reset(defaultValues);
      if (tenant) {
        setInitialRentRate(tenant.monthlyRentalRate);
      } else {
        setInitialRentRate(null);
      }
    }
  }, [tenant, isOpen, form, defaultValues]);

  const watchedRentRate = form.watch('monthlyRentalRate');
  const rentRateChanged = tenant && initialRentRate !== null && watchedRentRate !== initialRentRate;

  const onSubmit = (data: TenantFormValues) => {
    if (rentRateChanged && !data.rentAdjustmentDate) {
      form.setError("rentAdjustmentDate", { type: "manual", message: "Effective date is required for rent changes." });
      return;
    }
    
    try {
      const finalJoinDate = new Date(`${data.joinDate}T00:00:00.000Z`).toISOString();
      const finalAdjustmentDate = data.rentAdjustmentDate ? new Date(`${data.rentAdjustmentDate}T00:00:00.000Z`).toISOString() : undefined;
      
      const { rentAdjustmentDate, rentStartDate, rentEndDate, vehicleId, ...restOfData } = data;

      const submissionData: any = { 
        ...restOfData, 
        monthlyDueDay: restOfData.monthlyDueDay || null,
        vehicleId: vehicleId === 'none' ? undefined : vehicleId,
        rentStartDate: rentStartDate ? new Date(`${rentStartDate}T00:00:00.000Z`).toISOString() : undefined,
        rentEndDate: rentEndDate ? new Date(`${rentEndDate}T00:00:00.000Z`).toISOString() : undefined,
      };

      // For vehicle rentals, ensure rentEndDate is also set as contractEndDate for digital signature flow
      if (isVehicleRental && submissionData.rentEndDate) {
          submissionData.contractEndDate = submissionData.rentEndDate;
      }

      if (tenant) {
        updateTenant({ ...tenant, ...submissionData, joinDate: finalJoinDate }, finalAdjustmentDate);
        toast({ title: `${terminology.single} Updated`, description: `${data.name} has been updated successfully.` });
      } else {
        addTenant({...submissionData, joinDate: finalJoinDate});
        toast({ title: `${terminology.single} Added`, description: `${data.name} has been added successfully.` });
      }
      onClose();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save information." });
    }
  };

  const availableVehicles = useMemo(() => {
    return vehicles.filter(v => v.status === 'Available' || v.id === tenant?.vehicleId);
  }, [vehicles, tenant]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[525px] bg-card shadow-xl rounded-lg">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">{tenant ? `Edit ${terminology.single}` : `Add New ${terminology.single}`}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} autoComplete="off" className="space-y-6 p-2 max-h-[70vh] overflow-y-auto">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input {...field} autoComplete="off" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} autoComplete="off" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="off" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {isVehicleRental && (
              <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
                <h3 className="font-semibold text-sm uppercase text-muted-foreground border-b pb-2">Booking Details</h3>
                <FormField
                  control={form.control}
                  name="vehicleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign Vehicle</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a vehicle..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No Vehicle Assigned</SelectItem>
                          {availableVehicles.map(v => (
                            <SelectItem key={v.id} value={v.id}>{v.make} {v.model} ({v.plateNumber})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="rentStartDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rent Start Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="rentEndDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rent End Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="monthlyRentalRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isVehicleRental ? 'Daily Rate (₱)' : 'Monthly Rental Rate (₱)'}</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="securityDeposit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Security Deposit / Bond (₱)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <FormField
                control={form.control}
                name="joinDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isVehicleRental ? 'Registration Date' : 'Join Date'}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {!isVehicleRental && (
                <FormField
                    control={form.control}
                    name="monthlyDueDay"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Monthly Due Day</FormLabel>
                            <Select
                              onValueChange={(val) => field.onChange(val === 'default' ? null : Number(val))}
                              value={field.value ? String(field.value) : 'default'}
                            >
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Defaults to join date day" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="default">Use Join Date Day</SelectItem>
                                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                        <SelectItem key={day} value={String(day)}>{day}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Status</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="active" />
                        </FormControl>
                        <FormLabel className="font-normal">Active</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="inactive" />
                        </FormControl>
                        <FormLabel className="font-normal">Inactive</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              </DialogClose>
              <Button type="submit" variant="default" disabled={form.formState.isSubmitting}>{tenant ? 'Save Changes' : `Add ${terminology.single}`}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
