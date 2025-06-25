

"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { Payment, PaymentMethod, Tenant } from '@/lib/types';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, DollarSign, Info, CheckCircle2, TrendingDown, TrendingUp, BadgeDollarSign, Banknote, ShieldCheck } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { calculateTenantBalance } from '@/lib/utils';
import { ApplyDepositDialog } from '@/components/payments/ApplyDepositDialog';

const paymentMethods: PaymentMethod[] = ['Credit Card', 'Bank Transfer', 'Cash', 'Gcash', 'Other'];

const paymentFormSchema = z.object({
  tenantId: z.string().min(1, { message: "Please select a tenant." }),
  amount: z.coerce.number().nonnegative({ message: "Amount paid must be non-negative." }),
  date: z.date({ required_error: "Payment date is required." }),
  paymentMethod: z.enum(paymentMethods as [PaymentMethod, ...PaymentMethod[]]).optional(),
  discountApplied: z.coerce.number().nonnegative({ message: "Discount must be non-negative." }).optional(),
  discountDescription: z.string().max(100, { message: "Description should be 100 characters or less."}).optional(),
}).superRefine((data, ctx) => {
  if (data.amount > 0 && !data.paymentMethod) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Payment method is required when an amount is paid.",
      path: ["paymentMethod"],
    });
  }
  if ((data.amount === 0 || data.amount === undefined) && (data.discountApplied === 0 || data.discountApplied === undefined)) {
     ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Either amount paid or discount applied must be greater than zero.",
      path: ["amount"], // Or a general form error if preferred
    });
  }
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

interface PaymentFormProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTenantId?: string | null;
  payment?: Payment | null;
}

export function PaymentForm({ isOpen, onClose, defaultTenantId, payment }: PaymentFormProps) {
  const { tenants, payments: allPayments, additionalDues, addPayment, updatePayment } = useAppContext();
  const { toast } = useToast();
  const [runningBalanceForTenant, setRunningBalanceForTenant] = useState<number | null>(null);
  const [clientToday, setClientToday] = useState<Date | null>(null);
  const [isApplyDepositOpen, setIsApplyDepositOpen] = useState(false);

  const isEditing = !!payment;

  useEffect(() => {
    setClientToday(startOfDay(new Date()));
  }, []);

  const activeTenants = tenants.filter(t => t.status === 'active');
  
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
  });

  useEffect(() => {
    if (isOpen) {
       const resetValues = payment
        ? {
            ...payment,
            date: new Date(payment.date),
            amount: Number(payment.amount),
            discountApplied: Number(payment.discountApplied || 0),
            discountDescription: payment.discountDescription || '',
        }
        : {
          tenantId: defaultTenantId || '',
          amount: 0,
          date: new Date(),
          paymentMethod: undefined,
          discountApplied: 0, 
          discountDescription: '',
        };
      
      form.reset(resetValues);

      const tenantIdForBalance = resetValues.tenantId;
      if (tenantIdForBalance && clientToday) {
        const tenant = tenants.find(t => t.id === tenantIdForBalance);
        if (tenant) {
          const balance = calculateTenantBalance(tenant, allPayments, additionalDues, clientToday);
          setRunningBalanceForTenant(balance);
        } else {
          setRunningBalanceForTenant(null);
        }
      } else {
        setRunningBalanceForTenant(null);
      }
    }
  }, [isOpen, payment, defaultTenantId, form, clientToday, tenants, allPayments, additionalDues]);


  const selectedTenantId = form.watch('tenantId');
  const currentAmountPaid = form.watch('amount') || 0;
  const currentDiscountApplied = form.watch('discountApplied') || 0;
  const showDiscountDescription = currentDiscountApplied > 0;

  const selectedTenant = useMemo(() => {
    return tenants.find(t => t.id === selectedTenantId)
  }, [selectedTenantId, tenants]);

  useEffect(() => {
    if (selectedTenant && clientToday) {
      const balance = calculateTenantBalance(selectedTenant, allPayments, additionalDues, clientToday);
      setRunningBalanceForTenant(balance);
    } else if (!selectedTenant) {
        setRunningBalanceForTenant(null);
    }
  }, [selectedTenant, allPayments, additionalDues, clientToday]);

  const onSubmit = (data: PaymentFormValues) => {
    const discount = data.discountApplied || 0;
    const discountDesc = data.discountDescription || '';

    if (discount > 0 && !isEditing) {
      if (runningBalanceForTenant === null || runningBalanceForTenant <= 0) {
        form.setError("discountApplied", { type: "manual", message: "Cannot apply discount when no amount is due or tenant has a credit." });
        toast({ variant: "destructive", title: "Invalid Discount", description: "Discount cannot be applied if there is no outstanding balance." });
        return;
      }
      if (discount > runningBalanceForTenant) {
        form.setError("discountApplied", { type: "manual", message: `Discount (₱${discount.toFixed(2)}) cannot exceed the amount due (₱${runningBalanceForTenant.toFixed(2)}).` });
        toast({ variant: "destructive", title: "Invalid Discount", description: `Discount cannot exceed the amount due.` });
        return;
      }
    }
    if (discount === 0 && discountDesc.trim() !== '') {
        form.setError("discountDescription", {type: "manual", message: "Description cannot be provided if no discount is applied."});
        toast({variant: "destructive", title: "Invalid Description", description: "Cannot add description if no discount is applied."});
        return;
    }


    try {
      const payload = {
        ...data, 
        date: data.date.toISOString(), 
        discountApplied: discount, 
        discountDescription: discountDesc, 
        paymentMethod: data.paymentMethod 
      };

      if (isEditing && payment) {
        updatePayment({ ...payment, ...payload });
        toast({ title: "Payment Updated", description: "Payment record has been updated successfully." });
      } else {
        addPayment(payload);
        const tenantName = tenants.find(t => t.id === data.tenantId)?.name || 'Tenant';
        toast({ title: "Payment Recorded", description: `Payment for ${tenantName} recorded successfully.` });
      }
      onClose();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to record payment." });
    }
  };

  const balanceInfo = useMemo(() => {
    if (runningBalanceForTenant === null) return null;
    
    let text = "";
    let icon = <Info className="h-4 w-4 text-muted-foreground" />;
    let amountColor = "text-foreground";

    if (runningBalanceForTenant > 0) {
        text = "Amount Due Before This Transaction:";
        icon = <Banknote className="h-4 w-4 text-destructive" />;
        amountColor = "text-destructive";
    } else if (runningBalanceForTenant < 0) {
        text = "Credit Before This Transaction:";
        icon = <CheckCircle2 className="h-4 w-4 text-green-500" />;
        amountColor = "text-green-600";
    } else {
        text = "Balance Before This Transaction:";
        icon = <Banknote className="h-4 w-4 text-muted-foreground" />;
    }
    return { text, icon, amount: Math.abs(runningBalanceForTenant), amountColor };
  }, [runningBalanceForTenant]);

  const transactionSummary = useMemo(() => {
    if (runningBalanceForTenant === null) return null;
    const totalCredited = Number(currentAmountPaid) + Number(currentDiscountApplied);
    const remainingBalance = runningBalanceForTenant - totalCredited;
    
    let remainingBalanceText = "Remaining Balance:";
    let remainingBalanceColor = "text-foreground";
    if (remainingBalance < 0) {
      remainingBalanceText = "Credit After Transaction:";
      remainingBalanceColor = "text-green-600";
    } else if (remainingBalance > 0) {
      remainingBalanceColor = "text-destructive";
    }

    return {
      totalCredited,
      remainingBalance: Math.abs(remainingBalance),
      remainingBalanceText,
      remainingBalanceColor,
    };
  }, [runningBalanceForTenant, currentAmountPaid, currentDiscountApplied]);
  
  const canApplyDeposit = selectedTenant && (selectedTenant.securityDeposit || 0) > 0 && runningBalanceForTenant !== null && runningBalanceForTenant > 0;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
          onClose();
          setIsApplyDepositOpen(false); // Ensure child dialog also closes
        }
      }}>
        <DialogContent className="sm:max-w-[520px] bg-card shadow-xl rounded-lg">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl">{isEditing ? 'Edit Payment' : 'Record New Payment'}</DialogTitle>
            <DialogDescription>{isEditing ? 'Update the details for this payment record.' : 'Enter the details for the new payment record. Discounts can be applied against the current amount due.'}</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-2 max-h-[80vh] overflow-y-auto">
              <FormField
                control={form.control}
                name="tenantId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tenant</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value} 
                      defaultValue={field.value}
                      disabled={isEditing}
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

              {!isEditing && (
                <div className="mt-2 space-y-2">
                    {balanceInfo && (
                        <div className="p-3 border rounded-md bg-muted/50 text-sm">
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
                    {selectedTenant && (
                       <div className="p-3 border rounded-md bg-muted/50 text-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                              <ShieldCheck className="h-4 w-4 text-primary" />
                              <span className="font-medium">Security Deposit on File:</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-primary">
                                ₱{(selectedTenant.securityDeposit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <Button type="button" variant="secondary" size="sm" className="h-7" onClick={() => setIsApplyDepositOpen(true)} disabled={!canApplyDeposit}>
                              Use
                            </Button>
                          </div>
                        </div>
                       </div>
                    )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount Paid (₱)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <span className="text-muted-foreground">₱</span>
                          </span>
                          <Input type="number" step="0.01" placeholder="e.g. 500" {...field} className="pl-7" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="discountApplied"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Applied (₱)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <span className="text-muted-foreground">₱</span>
                          </span>
                          <Input type="number" step="0.01" placeholder="e.g. 50" {...field} className="pl-7" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {showDiscountDescription && (
                  <FormField
                      control={form.control}
                      name="discountDescription"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Discount Description</FormLabel>
                          <FormControl>
                              <Textarea placeholder="e.g., Early payment incentive, Loyalty bonus" {...field} />
                          </FormControl>
                          <FormMessage />
                          </FormItem>
                      )}
                  />
              )}
              
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
                    <FormLabel>{(form.getValues("amount") || 0) > 0 ? 'Payment Method' : 'Payment Method (Optional)'}</FormLabel>
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

              {!isEditing && transactionSummary && selectedTenantId && (runningBalanceForTenant !== null) && (
                  <div className="mt-2 p-3 border-t text-sm space-y-1">
                      <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                              <BadgeDollarSign className="h-4 w-4 text-blue-500" />
                              <span className="font-medium">Total Credited This Transaction:</span>
                          </div>
                          <span className="font-semibold text-blue-600">
                              ₱{transactionSummary.totalCredited.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                      </div>
                      <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                              {transactionSummary.remainingBalance === 0 && !transactionSummary.remainingBalanceColor.includes('destructive') && !transactionSummary.remainingBalanceColor.includes('green') && <CheckCircle2 className="h-4 w-4 text-muted-foreground"/> }
                              {transactionSummary.remainingBalance > 0 && transactionSummary.remainingBalanceColor.includes('destructive') && <TrendingDown className="h-4 w-4 text-destructive"/> }
                              {transactionSummary.remainingBalance > 0 && transactionSummary.remainingBalanceColor.includes('green') && <TrendingUp className="h-4 w-4 text-green-500"/> }
                              <span className="font-medium">{transactionSummary.remainingBalanceText}</span>
                          </div>
                          <span className={cn("font-semibold", transactionSummary.remainingBalanceColor)}>
                              ₱{transactionSummary.remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                      </div>
                  </div>
              )}
              
              <DialogFooter className="pt-4">
                <DialogClose asChild>
                  <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                </DialogClose>
                <Button type="submit" variant="default">{isEditing ? 'Save Changes' : 'Record Payment'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {isApplyDepositOpen && selectedTenant && runningBalanceForTenant !== null && (
        <ApplyDepositDialog
          isOpen={isApplyDepositOpen}
          onClose={() => setIsApplyDepositOpen(false)}
          tenant={selectedTenant}
          currentBalance={runningBalanceForTenant}
        />
      )}
    </>
  );
}
