
"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { Tenant } from '@/lib/types';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ShieldAlert } from 'lucide-react';

interface ApplyDepositDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant;
  currentBalance: number;
}

export function ApplyDepositDialog({ isOpen, onClose, tenant, currentBalance }: ApplyDepositDialogProps) {
  const { applySecurityDeposit } = useAppContext();
  const { toast } = useToast();

  const securityDeposit = tenant.securityDeposit || 0;
  const maxAmountToApply = Math.min(securityDeposit, currentBalance);

  const formSchema = z.object({
    amountToApply: z.coerce.number()
      .positive({ message: "Amount must be greater than zero." })
      .max(maxAmountToApply, { message: `Cannot apply more than the available deposit or the current due of ₱${maxAmountToApply.toFixed(2)}.` }),
  });
  
  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amountToApply: maxAmountToApply,
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      await applySecurityDeposit(tenant.id, data.amountToApply);
      onClose();
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to apply deposit.' });
    }
  };
  
  const formatCurrency = (amount: number) => `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Use Security Deposit</DialogTitle>
          <DialogDescription>
            Use {tenant.name}'s security deposit to pay off their outstanding balance.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Available Deposit:</span>
                <span className="font-medium">{formatCurrency(securityDeposit)}</span>
            </div>
            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current Amount Due:</span>
                <span className="font-medium text-destructive">{formatCurrency(currentBalance)}</span>
            </div>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <FormField
                control={form.control}
                name="amountToApply"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Amount to Apply</FormLabel>
                        <FormControl>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground">₱</span>
                                <Input type="number" step="0.01" {...field} className="pl-8" />
                            </div>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
             <div className="p-3 bg-destructive/10 text-destructive border-l-4 border-destructive rounded-r-md">
                <div className="flex">
                  <ShieldAlert className="h-5 w-5 mr-2" />
                  <div className="text-xs">
                    <p className="font-semibold">This action is irreversible.</p>
                    <p>The applied amount will be permanently deducted from the security deposit and recorded as a payment.</p>
                  </div>
                </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit" variant="destructive" disabled={form.formState.isSubmitting}>Use Deposit</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
