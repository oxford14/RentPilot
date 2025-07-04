
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CalendarClock, CalendarCheck } from 'lucide-react';
import type { Tenant } from '@/lib/types';
import { add, format } from 'date-fns';

const durationFormSchema = z.object({
  duration: z.coerce.number().int().positive("Duration must be a positive number."),
  unit: z.enum(['months', 'years']),
});

type FormValues = z.infer<typeof durationFormSchema>;

interface ContractDurationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant | null;
  mode: 'new' | 'renew';
  onConfirm: (endDate: Date) => void;
}

export function ContractDurationDialog({ isOpen, onClose, tenant, mode, onConfirm }: ContractDurationDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(durationFormSchema),
    defaultValues: {
      duration: 1,
      unit: 'years',
    },
  });

  const watchDuration = form.watch('duration');
  const watchUnit = form.watch('unit');

  const { startDate, calculatedEndDate } = useMemo(() => {
    if (!tenant) return { startDate: null, calculatedEndDate: null };

    const start = mode === 'renew' && tenant.contractEndDate
      ? add(new Date(tenant.contractEndDate), { days: 1 })
      : new Date(tenant.joinDate);
    
    const duration = Number(watchDuration) || 0;
    const unit = watchUnit || 'years';

    if (duration <= 0) return { startDate: start, calculatedEndDate: null };
    
    const endDate = new Date(start);
    if (unit === 'months') {
      endDate.setUTCMonth(endDate.getUTCMonth() + duration);
    } else if (unit === 'years') {
      endDate.setUTCFullYear(endDate.getUTCFullYear() + duration);
    }
    
    return { startDate: start, calculatedEndDate: endDate };
  }, [tenant, mode, watchDuration, watchUnit]);

  const onSubmit = async (data: FormValues) => {
    if (!calculatedEndDate) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not calculate end date.' });
        return;
    }
    setIsLoading(true);
    try {
      onConfirm(calculatedEndDate);
      toast({ title: 'Contract End Date Set', description: 'Proceeding to the next step.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message || 'Failed to set duration.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      form.reset({
        duration: 1,
        unit: 'years',
      });
    }
  }, [isOpen, form]);

  if (!tenant) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'renew' ? 'Renew Contract for ' : 'Set Contract Duration for '}{tenant.name}</DialogTitle>
          <DialogDescription>
            Specify the contract term. The end date will be calculated automatically.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="months">Months</SelectItem>
                          <SelectItem value="years">Years</SelectItem>
                        </SelectContent>
                      </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="space-y-2">
                <div className="flex justify-between items-center text-sm p-3 bg-muted rounded-md">
                    <span className="font-medium flex items-center gap-2"><CalendarClock className="h-4 w-4"/>Start Date:</span>
                    <span className="font-bold">{startDate ? format(startDate, 'PPP') : 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center text-sm p-3 bg-muted rounded-md">
                    <span className="font-medium flex items-center gap-2"><CalendarCheck className="h-4 w-4"/>Calculated End Date:</span>
                    <span className="font-bold">{calculatedEndDate ? format(calculatedEndDate, 'PPP') : 'N/A'}</span>
                </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit" disabled={isLoading || !calculatedEndDate}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Confirm & Continue
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
