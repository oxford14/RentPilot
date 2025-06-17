
"use client";

import React from 'react';
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

const tenantFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  phone: z.string().min(10, { message: "Phone number must be at least 10 digits." }).regex(/^\S*$/, { message: "Phone number cannot contain spaces." }),
  monthlyRentalRate: z.coerce.number().min(0, { message: "Rental rate must be a positive number." }),
  status: z.enum(['active', 'inactive']),
  joinDate: z.string().refine((date) => !isNaN(new Date(date).getTime()), { message: "Invalid date" }),
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

  const defaultValues = tenant ? {
    ...tenant,
    joinDate: tenant.joinDate ? new Date(tenant.joinDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
  } : {
    name: '',
    email: '',
    phone: '',
    monthlyRentalRate: 0,
    status: 'active' as 'active' | 'inactive',
    joinDate: new Date().toISOString().split('T')[0],
  };
  
  const form = useForm<TenantFormValues>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues,
  });

  React.useEffect(() => {
    if (tenant) {
      form.reset({
        ...tenant,
        joinDate: tenant.joinDate ? new Date(tenant.joinDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      });
    } else {
      form.reset(defaultValues);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant, form.reset, isOpen]);


  const onSubmit = (data: TenantFormValues) => {
    try {
      if (tenant) {
        updateTenant({ ...tenant, ...data, joinDate: new Date(data.joinDate).toISOString() });
        toast({ title: "Tenant Updated", description: `${data.name} has been updated successfully.` });
      } else {
        addTenant({...data, joinDate: new Date(data.joinDate).toISOString()});
        toast({ title: "Tenant Added", description: `${data.name} has been added successfully.` });
      }
      form.reset(defaultValues); // Reset form to default after successful submission
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-2 max-h-[70vh] overflow-y-auto">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. John Doe" {...field} />
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
                      <Input type="email" placeholder="e.g. john.doe@example.com" {...field} />
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
                      <Input placeholder="e.g. 123-456-7890" {...field} />
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
                    <FormLabel>Monthly Rental Rate ($)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g. 1200" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
              <Button type="submit" variant="default">{tenant ? 'Save Changes' : 'Add Tenant'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
