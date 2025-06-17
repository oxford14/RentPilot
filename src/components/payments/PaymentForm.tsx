
"use client";

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { PaymentMethod, Tenant } from '@/lib/types';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, DollarSign, Info, CheckCircle2 } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { calculateTenantBalance } from '@/lib/utils';

const paymentMethods: PaymentMethod[] = ['Credit Card', 'Bank Transfer', 'Cash', 'Other'];

const paymentFormSchema = z.object({
  tenantId: z.string().min(1, { message: "Please select a tenant." }),
  amount: z.coerce.number().positive({ message: "Amount must be positive." }),
  date: z.date({ required_error: "Payment date is required." }),
  paymentMethod: z.enum(paymentMethods as [PaymentMethod, ...PaymentMethod[]], {
    required_error: "Payment method is required.",
  }),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

interface PaymentFormProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTenantId?: string | null;
}

export function PaymentForm({ isOpen, onClose, defaultTenantId }: PaymentFormProps) {
  const { tenants, payments: allPayments, addPayment } = useAppContext();
  const { toast } = useToast();
  const [amountDueForSelectedTenant, setAmountDueForSelectedTenant] = useState<number | null>(null);
  const [clientToday, setClientToday] = useState<Date | null>(null);

  useEffect(() => {
    setClientToday(startOfDay(new Date()));
  }, []);

  const activeTenants = tenants.filter(t => t.status === 'active');

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      tenantId: defaultTenantId || '',
      amount: 0,
      date: new Date(),
      paymentMethod: undefined,
    },
  });

  const selectedTenantId = form.watch('tenantId');

  useEffect(() => {
    if (selectedTenantId && clientToday) {
      const tenant = tenants.find(t => t.id === selectedTenantId);
      if (tenant) {
        const balance = calculateTenantBalance(tenant, allPayments, clientToday);
        setAmountDueForSelectedTenant(balance);
      } else {
        setAmountDueForSelectedTenant(null);
      }
    } else {
      setAmountDueForSelectedTenant(null);
    }
  }, [selectedTenantId, tenants, allPayments, clientToday]);

  useEffect(() => {
    if (isOpen) {
      form.reset({
        tenantId: defaultTenantId || '',
        amount: 0,
        date: new Date(),
        paymentMethod: undefined,
      });
      // Recalculate balance if defaultTenantId is present on open
      if (defaultTenantId && clientToday) {
        const tenant = tenants.find(t => t.id === defaultTenantId);
        if (tenant) {
            const balance = calculateTenantBalance(tenant, allPayments, clientToday);
            setAmountDueForSelectedTenant(balance);
        }
      } else {
        setAmountDueForSelectedTenant(null);
      }
    }
  }, [isOpen, defaultTenantId, form, clientToday, tenants, allPayments]);


  const onSubmit = (data: PaymentFormValues) => {
    try {
      addPayment({...data, date: data.date.toISOString()});
      const tenantName = tenants.find(t => t.id === data.tenantId)?.name || 'Tenant';
      toast({ title: "Payment Recorded", description: `Payment of ₱${data.amount} for ${tenantName} recorded successfully.` });
      form.reset({ 
        tenantId: defaultTenantId || '', 
        amount: 0, 
        date: new Date(), 
        paymentMethod: undefined 
      });
      setAmountDueForSelectedTenant(null); // Reset balance display on successful submission
      onClose();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to record payment." });
    }
  };

  const getBalanceDisplayInfo = () => {
    if (amountDueForSelectedTenant === null) return null;
    
    let text = "";
    let icon = <Info className="h-4 w-4 text-muted-foreground" />;
    let amountColor = "text-foreground";

    if (amountDueForSelectedTenant > 0) {
        text = "Current Amount Due:";
        icon = <DollarSign className="h-4 w-4 text-destructive" />;
        amountColor = "text-destructive";
    } else if (amountDueForSelectedTenant < 0) {
        text = "Current Credit/Deposit:";
        icon = <CheckCircle2 className="h-4 w-4 text-green-500" />;
        amountColor = "text-green-600";
    } else {
        text = "Current Balance:";
        icon = <DollarSign className="h-4 w-4 text-muted-foreground" />;
    }
    return { text, icon, amount: Math.abs(amountDueForSelectedTenant), amountColor };
  };

  const balanceInfo = getBalanceDisplayInfo();


  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
            onClose();
            setAmountDueForSelectedTenant(null); // Clear balance when dialog closes
        }
    }}>
      <DialogContent className="sm:max-w-[480px] bg-card shadow-xl rounded-lg">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Record New Payment</DialogTitle>
          <DialogDescription>Enter the details for the new payment record.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-2 max-h-[70vh] overflow-y-auto">
            <FormField
              control={form.control}
              name="tenantId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tenant</FormLabel>
                  <Select onValueChange={(value) => {
                    field.onChange(value);
                    // Trigger balance recalculation when tenant changes
                    if (value && clientToday) {
                        const tenant = tenants.find(t => t.id === value);
                        if (tenant) {
                            const balance = calculateTenantBalance(tenant, allPayments, clientToday);
                            setAmountDueForSelectedTenant(balance);
                        } else {
                             setAmountDueForSelectedTenant(null);
                        }
                    } else {
                        setAmountDueForSelectedTenant(null);
                    }
                  }} 
                  value={field.value} 
                  defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a tenant" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activeTenants.map(tenant => (
                        <SelectItem key={tenant.id} value={tenant.id}>
                          {tenant.name} (Rent: ₱{tenant.monthlyRentalRate.toLocaleString()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {balanceInfo && (
                <div className="mt-2 p-3 border rounded-md bg-muted/50 text-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            {balanceInfo.icon}
                            <span className="font-medium">{balanceInfo.text}</span>
                        </div>
                        <span className={cn("font-semibold", balanceInfo.amountColor)}>
                            ₱{balanceInfo.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
            )}

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount Paid (₱)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground">₱</span>
                      <Input type="number" step="0.01" placeholder="e.g. 500" {...field} className="pl-8" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Payment Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {paymentMethods.map(method => (
                        <SelectItem key={method} value={method}>
                          {method}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={() => {
                    onClose();
                    setAmountDueForSelectedTenant(null);
                }}>Cancel</Button>
              </DialogClose>
              <Button type="submit" variant="default">Record Payment</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

