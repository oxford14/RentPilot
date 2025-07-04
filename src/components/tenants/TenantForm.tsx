
"use client";

import React, { useState, useEffect } from 'react';
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
  joinDate: z.string().refine((date) => date === '' || !isNaN(new Date(date).getTime()), { message: "Invalid date" }).refine(date => date !== '', { message: "Join date is required." }),
  monthlyDueDay: z.coerce.number().min(1).max(31).optional().nullable(),
  rentAdjustmentDate: z.string().optional(),
});

type TenantFormValues = z.infer<typeof tenantFormSchema>;

interface TenantFormProps {
  isOpen: boolean;
  onClose: () => void;
  tenant?: Tenant | null; // For editing
}

export function TenantForm({ isOpen, onClose, tenant }: TenantFormProps) {
  const { addTenant, updateTenant } = useAppContext();
  const { toast } = useToast();
  const [initialRentRate, setInitialRentRate] = useState<number | null>(null);

  const [newTenantJoinDate] = useState(() => new Date().toISOString().split('T')[0]);

  const defaultValues = React.useMemo(() => {
    return tenant ? {
      ...tenant,
      email: tenant.email || '',
      phone: tenant.phone || '',
      securityDeposit: tenant.securityDeposit || 0,
      joinDate: tenant.joinDate ? new Date(tenant.joinDate).toISOString().split('T')[0] : newTenantJoinDate,
      monthlyDueDay: tenant.monthlyDueDay || undefined,
      rentAdjustmentDate: undefined,
    } : {
      name: '',
      email: '',
      phone: '',
      monthlyRentalRate: 0,
      securityDeposit: 0,
      status: 'active' as 'active' | 'inactive',
      joinDate: newTenantJoinDate,
      monthlyDueDay: undefined,
      rentAdjustmentDate: undefined,
    };
  }, [tenant, newTenantJoinDate]);
  
  const form = useForm<TenantFormValues>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (isOpen) {
      form.reset(
        tenant 
        ? { 
            ...tenant,
            email: tenant.email || '',
            phone: tenant.phone || '',
            securityDeposit: tenant.securityDeposit || 0,
            joinDate: tenant.joinDate ? new Date(tenant.joinDate).toISOString().split('T')[0] : newTenantJoinDate,
            monthlyDueDay: tenant.monthlyDueDay || undefined,
            rentAdjustmentDate: undefined
          }
        : { name: '', email: '', phone: '', monthlyRentalRate: 0, securityDeposit: 0, status: 'active' as 'active' | 'inactive', joinDate: newTenantJoinDate, monthlyDueDay: undefined, rentAdjustmentDate: undefined }
      );
      if (tenant) {
        setInitialRentRate(tenant.monthlyRentalRate);
      } else {
        setInitialRentRate(null);
      }
    }
  }, [tenant, isOpen, form, newTenantJoinDate]);

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
      
      const submissionData = { ...data, monthlyDueDay: data.monthlyDueDay || undefined };

      if (tenant) {
        updateTenant({ ...tenant, ...submissionData, joinDate: finalJoinDate }, finalAdjustmentDate);
        toast({ title: "Tenant Updated", description: `${data.name} has been updated successfully.` });
      } else {
        addTenant({...submissionData, joinDate: finalJoinDate});
        toast({ title: "Tenant Added", description: `${data.name} has been added successfully.` });
      }
      const resetValues = { name: '', email: '', phone: '', monthlyRentalRate: 0, securityDeposit: 0, status: 'active' as 'active' | 'inactive', joinDate: newTenantJoinDate, monthlyDueDay: undefined, rentAdjustmentDate: undefined };
      form.reset(resetValues); 
      onClose();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save tenant information." });
      console.error("Form submission error:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[525px] bg-card shadow-xl rounded-lg">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">{tenant ? 'Edit Tenant' : 'Add New Tenant'}</DialogTitle>
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
                      <Input type="email" placeholder="" {...field} autoComplete="off" />
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="monthlyRentalRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Rental Rate (₱)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">
                      {rentRateChanged 
                        ? "Please select the effective date for this new rate."
                        : "Changing this will create a new versioned entry in the tenant's rent history."}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="securityDeposit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Security Deposit (₱)</FormLabel>
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
                    <FormLabel>Join Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                  control={form.control}
                  name="monthlyDueDay"
                  render={({ field }) => (
                      <FormItem>
                          <FormLabel>Monthly Due Day</FormLabel>
                          <Select onValueChange={(val) => field.onChange(val ? Number(val) : null)} value={String(field.value || '')}>
                              <FormControl>
                                  <SelectTrigger>
                                      <SelectValue placeholder="Defaults to join date day" />
                                  </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                  <SelectItem value="">Use Join Date Day</SelectItem>
                                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                      <SelectItem key={day} value={String(day)}>{day}</SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                          <FormDescription className="text-xs">
                              The day of the month rent is due.
                          </FormDescription>
                          <FormMessage />
                      </FormItem>
                  )}
              />
            </div>

            {rentRateChanged && (
               <FormField
                control={form.control}
                name="rentAdjustmentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rent Adjustment Effective Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ''}/>
                    </FormControl>
                     <FormDescription className="text-xs">
                       The new rent rate will apply starting from this date.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
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
              <Button type="submit" variant="default">{tenant ? 'Save Changes' : 'Add Tenant'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
