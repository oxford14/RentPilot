
"use client";

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { getFriendlyErrorMessage } from '@/lib/friendly-errors';
import type { Vehicle } from '@/lib/types';
import { VehicleMakeCombobox } from '@/components/vehicles/VehicleMakeCombobox';
import { isValidVehicleMake, normalizeVehicleMake } from '@/lib/vehicle-makes';

const vehicleFormSchema = z.object({
  make: z
    .string()
    .min(1, 'Make is required')
    .refine(isValidVehicleMake, 'Select a make from the list'),
  model: z.string().min(1, "Model is required"),
  year: z.coerce.number().min(1900).max(new Date().getFullYear() + 1),
  plateNumber: z.string().min(1, "Plate number is required"),
  categoryId: z.string().min(1, "Category is required"),
  dailyRate: z.coerce.number().min(0),
  status: z.enum(['Available', 'Rented', 'Maintenance']),
});

type VehicleFormValues = z.infer<typeof vehicleFormSchema>;

interface VehicleFormProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle?: Vehicle | null;
}

export function VehicleForm({ isOpen, onClose, vehicle }: VehicleFormProps) {
  const { addVehicle, updateVehicle, vehicleCategories } = useAppContext();
  const { toast } = useToast();

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      make: '',
      model: '',
      year: new Date().getFullYear(),
      plateNumber: '',
      categoryId: '',
      dailyRate: 0,
      status: 'Available',
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (vehicle) {
        form.reset({
          make: normalizeVehicleMake(vehicle.make) ?? '',
          model: vehicle.model,
          year: vehicle.year,
          plateNumber: vehicle.plateNumber,
          categoryId: vehicle.categoryId || '',
          dailyRate: vehicle.dailyRate,
          status: vehicle.status,
        });
      } else {
        form.reset({
          make: '',
          model: '',
          year: new Date().getFullYear(),
          plateNumber: '',
          categoryId: vehicleCategories[0]?.id || '',
          dailyRate: 0,
          status: 'Available',
        });
      }
    }
  }, [isOpen, vehicle, form, vehicleCategories]);

  const onSubmit = async (data: VehicleFormValues) => {
    if (vehicleCategories.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No categories',
        description: 'Add a vehicle category before adding fleet units.',
      });
      return;
    }
    try {
      const normalizedMake = normalizeVehicleMake(data.make);
      if (!normalizedMake) {
        form.setError('make', { message: 'Select a make from the list' });
        return;
      }
      const payload = { ...data, make: normalizedMake };
      if (vehicle) {
        await updateVehicle({ ...vehicle, ...payload });
        toast({ title: "Vehicle Updated" });
      } else {
        await addVehicle(payload);
        toast({ title: "Vehicle Added" });
      }
      onClose();
    } catch (e: unknown) {
      const message = getFriendlyErrorMessage(e, 'We couldn’t save this vehicle. Please try again.');
      toast({ variant: "destructive", title: "Save failed", description: message });
    }
  };

  const noCategories = vehicleCategories.length === 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{vehicle ? 'Edit Vehicle' : 'Add New Vehicle'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {noCategories && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                No categories found.{' '}
                <Link href="/vehicle-categories" className="underline font-medium">
                  Add a category first
                </Link>
                .
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="make"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Make</FormLabel>
                    <FormControl>
                      <VehicleMakeCombobox
                        value={field.value}
                        onChange={field.onChange}
                        disabled={noCategories}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model</FormLabel>
                    <FormControl><Input placeholder="Vios" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={noCategories}
                  >
                    <FormControl>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vehicleCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Sedan, SUV, 7-Seater, etc.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="plateNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plate Number</FormLabel>
                    <FormControl><Input placeholder="ABC 1234" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dailyRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Daily Rate (₱)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Available">Available</SelectItem>
                        <SelectItem value="Rented">Rented</SelectItem>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="w-full sm:w-auto">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" className="w-full sm:flex-1" disabled={noCategories}>
                {vehicle ? 'Save Changes' : 'Add Vehicle'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
