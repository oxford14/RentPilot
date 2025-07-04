
"use client";

import React, { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';
import { Loader2, Send } from 'lucide-react';
import type { Tenant } from '@/lib/types';
import { format, startOfMonth, addMonths } from 'date-fns';

const requestFormSchema = z.object({
  proposedRate: z.coerce.number().positive("Proposed rate must be a positive number."),
  reason: z.string().min(10, "Please provide a reason (min 10 characters).").max(300, "Reason cannot exceed 300 characters."),
});

type FormValues = z.infer<typeof requestFormSchema>;

interface RentAdjustmentRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant;
}

export function RentAdjustmentRequestDialog({ isOpen, onClose, tenant }: RentAdjustmentRequestDialogProps) {
  const { addRentAdjustmentRequest } = useAppContext();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: {
      proposedRate: tenant.monthlyRentalRate,
      reason: '',
    },
  });

  const effectiveDate = React.useMemo(() => {
    const today = new Date();
    return startOfMonth(addMonths(today, 1));
  }, []);

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      await addRentAdjustmentRequest({
        tenantId: tenant.id,
        currentRate: tenant.monthlyRentalRate,
        proposedRate: data.proposedRate,
        reason: data.reason,
        effectiveDate: effectiveDate.toISOString(),
      });
      toast({
        title: "Request Submitted",
        description: "Your rent adjustment request has been sent to your landlord for review.",
      });
      onClose();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: error.message || "An unknown error occurred.",
      });
    } finally {
      setIsLoading(false);
      form.reset();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Rent Adjustment</DialogTitle>
          <DialogDescription>
            Propose a new rental rate to your landlord. If approved, the new rate will apply starting {format(effectiveDate, 'MMMM yyyy')}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-md text-sm">
              <span className="text-muted-foreground">Current Monthly Rent:</span>
              <span className="font-semibold ml-2">₱{tenant.monthlyRentalRate.toLocaleString()}</span>
            </div>
            <FormField
              control={form.control}
              name="proposedRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Proposed Monthly Rate (₱)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Request</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Requesting a loyalty discount for long-term tenancy..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
