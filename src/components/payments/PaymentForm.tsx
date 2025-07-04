
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from '@/components/ui/separator';
import type { Payment, PaymentMethod, Tenant, BalanceBreakdown } from '@/lib/types';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, DollarSign, Info, CheckCircle2, TrendingDown, TrendingUp, BadgeDollarSign, Banknote, ShieldCheck, ChevronDown, ListPlus, Home, Send, PercentCircle, MinusCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ApplyDepositDialog } from '@/components/payments/ApplyDepositDialog';
import { calculateTenantBalanceBreakdown } from '@/lib/utils';

const paymentMethods: PaymentMethod[] = ['Credit Card', 'Bank Transfer', 'Cash', 'Gcash', 'Check', 'Other'];

const paymentFormSchema = z.object({
  tenantId: z.string().min(1, { message: "Please select a tenant." }),
  amount: z.coerce.number().nonnegative({ message: "Amount paid must be non-negative." }),
  date: z.date({ required_error: "Payment date is required." }),
  paymentMethod: z.enum(paymentMethods as [PaymentMethod, ...PaymentMethod[]]).optional(),
  checkNumber: z.string().optional(),
  discountApplied: z.coerce.number().nonnegative({ message: "Discount must be non-negative." }).optional(),
  discountDescription: z.string().max(100, { message: "Description should be 100 characters or less."}).optional(),
}).superRefine((data, ctx) => {
  if ((data.amount ?? 0) > 0 && !data.paymentMethod) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Payment method is required when an amount is paid.",
      path: ["paymentMethod"],
    });
  }
  if (data.paymentMethod === 'Check' && (!data.checkNumber || data.checkNumber.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Check number is required for this payment method.",
      path: ["checkNumber"],
    });
  }
  if ((data.amount === 0 || data.amount === undefined) && (data.discountApplied === 0 || data.discountApplied === undefined)) {
     ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Either amount paid or discount applied must be greater than zero.",
      path: ["amount"],
    });
  }
  if ((data.discountApplied === 0 || data.discountApplied === undefined) && (data.discountDescription?.trim() ?? '') !== '') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Description cannot be provided if no discount is applied.",
      path: ["discountDescription"],
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

const formatCurrency = (num: number) => num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function PaymentForm({ isOpen, onClose, defaultTenantId, payment }: PaymentFormProps) {
  const { tenants, payments, additionalDues, systemTimezone, addPayment, updatePayment } = useAppContext();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isApplyDepositOpen, setIsApplyDepositOpen] = useState(false);
  const [showDiscountFields, setShowDiscountFields] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  const [balanceBreakdown, setBalanceBreakdown] = useState<BalanceBreakdown | null>(null);
  const [clientToday, setClientToday] = useState<Date | null>(null);

  const isEditing = !!payment;
  
  const activeTenants = tenants.filter(t => t.status === 'active');
  
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
  });

  useEffect(() => {
    if (!isOpen) return;
    const now = new Date();
    const timeZone = systemTimezone || 'Etc/UTC';
     try {
        const dateParts = new Intl.DateTimeFormat('en-CA', {
            year: 'numeric', month: '2-digit', day: '2-digit', timeZone,
        }).formatToParts(now).reduce((acc, part) => {
            if (part.type !== 'literal') {
                (acc as any)[part.type] = parseInt(part.value);
            }
            return acc;
        }, {} as Record<string, number>);
        const todayInSystemTimezone = new Date(Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day));
        setClientToday(todayInSystemTimezone);
    } catch (e) {
        const now = new Date();
        setClientToday(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())));
    }
  }, [isOpen, systemTimezone]);

  useEffect(() => {
    if (isOpen) {
       const resetValues = payment
        ? {
            ...payment,
            date: new Date(payment.date),
            amount: Number(payment.amount),
            checkNumber: payment.checkNumber || '',
            discountApplied: Number(payment.discountApplied || 0),
            discountDescription: payment.discountDescription || '',
        }
        : {
          tenantId: defaultTenantId || '',
          amount: 0,
          date: new Date(),
          paymentMethod: undefined,
          checkNumber: '',
          discountApplied: 0, 
          discountDescription: '',
        };
      
      form.reset(resetValues);
      setShowDiscountFields(!!(payment?.discountApplied && payment.discountApplied > 0));
    } else {
        setBalanceBreakdown(null);
        setShowDiscountFields(false);
    }
  }, [isOpen, payment, defaultTenantId, form]);


  const selectedTenantId = form.watch('tenantId');
  const currentAmountPaid = form.watch('amount') || 0;
  const currentDiscountApplied = form.watch('discountApplied') || 0;
  const watchedPaymentMethod = form.watch('paymentMethod');

  const selectedTenant = useMemo(() => {
    return tenants.find(t => t.id === selectedTenantId)
  }, [selectedTenantId, tenants]);

  const canApplyDiscount = user?.isSuperAdmin || user?.role === 'admin' || !!user?.canApplyDiscount;


  useEffect(() => {
    if (!selectedTenantId || !clientToday) {
      setBalanceBreakdown(null);
      return;
    }

    const tenantForBalance = tenants.find(t => t.id === selectedTenantId);
    if (tenantForBalance) {
      let breakdown = calculateTenantBalanceBreakdown(tenantForBalance, payments, additionalDues, clientToday);
      if (isEditing && payment && payment.tenantId === selectedTenantId) {
        const totalCredited = (payment.amount || 0) + (payment.discountApplied || 0);
        breakdown.total += totalCredited;
        breakdown.rentDue += totalCredited; 
      }
      setBalanceBreakdown(breakdown);
    }
  }, [selectedTenantId, clientToday, tenants, payments, additionalDues, isEditing, payment]);

  const onSubmit = (data: PaymentFormValues) => {
    const discount = data.discountApplied || 0;
    const discountDesc = data.discountDescription || '';
    const balanceBefore = balanceBreakdown?.total ?? 0;

    if (discount > 0 && !isEditing) {
      if (balanceBefore === null || balanceBefore <= 0) {
        form.setError("discountApplied", { type: "manual", message: "Cannot apply discount when no amount is due or tenant has a credit." });
        toast({ variant: "destructive", title: "Invalid Discount", description: "Discount cannot be applied if there is no outstanding balance." });
        return;
      }
      if (discount > balanceBefore) {
        form.setError("discountApplied", { type: "manual", message: `Discount (₱${discount.toFixed(2)}) cannot exceed the amount due (₱${balanceBefore.toFixed(2)}).` });
        toast({ variant: "destructive", title: "Invalid Discount", description: `Discount cannot exceed the amount due.` });
        return;
      }
    }

    try {
      const payload = {
        ...data, 
        date: data.date.toISOString(), 
        discountApplied: discount, 
        discountDescription: discountDesc, 
        paymentMethod: (data.amount ?? 0) > 0 ? data.paymentMethod : undefined
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
    if (balanceBreakdown === null) return null;
    const { total } = balanceBreakdown;

    let text = "";
    let icon = <Info className="h-4 w-4 text-muted-foreground" />;
    let amountColor = "text-foreground";

    if (total > 0) {
        text = "Amount Due Before This Transaction:";
        icon = <Banknote className="h-4 w-4 text-destructive" />;
        amountColor = "text-destructive";
    } else if (total < 0) {
        text = "Credit Before This Transaction:";
        icon = <CheckCircle2 className="h-4 w-4 text-green-500" />;
        amountColor = "text-green-600";
    } else {
        text = "Balance Before This Transaction:";
        icon = <Banknote className="h-4 w-4 text-muted-foreground" />;
    }
    return { text, icon, amount: Math.abs(total), amountColor };
  }, [balanceBreakdown]);

  const transactionSummary = useMemo(() => {
    if (balanceBreakdown === null) return null;
    const totalCredited = Number(currentAmountPaid) + Number(currentDiscountApplied);
    const remainingBalance = balanceBreakdown.total - totalCredited;
    
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
  }, [balanceBreakdown, currentAmountPaid, currentDiscountApplied]);
  
  const canApplyDeposit = selectedTenant && (selectedTenant.securityDeposit || 0) > 0 && balanceBreakdown !== null && balanceBreakdown.total > 0;

  const handleCancelDiscount = () => {
    setShowDiscountFields(false);
    form.setValue('discountApplied', 0);
    form.setValue('discountDescription', '');
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
          onClose();
          setIsApplyDepositOpen(false);
        }
      }}>
        <DialogContent className="sm:max-w-[520px] bg-card shadow-xl rounded-lg">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl">{isEditing ? 'Edit Payment' : 'Record New Payment'}</DialogTitle>
            <DialogDescription>{isEditing ? 'Update the details for this payment record.' : 'Enter the details for the new payment record. Discounts can be applied against the current amount due.'}</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} autoComplete="off" className="space-y-4 p-2 max-h-[80vh] overflow-y-auto">
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

              {!isEditing && selectedTenantId && (
                <div className="mt-2 space-y-2">
                    {balanceInfo && (
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="item-1" className="border rounded-md bg-muted/50 overflow-hidden">
                                <AccordionTrigger className="p-3 text-sm hover:no-underline [&[data-state=open]>svg]:text-primary">
                                    <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center gap-1.5">
                                            {balanceInfo.icon}
                                            <span className="font-medium">{balanceInfo.text}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={cn("font-semibold", balanceInfo.amountColor)}>
                                                ₱{formatCurrency(balanceInfo.amount)}
                                            </span>
                                            <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-3 border-t bg-background">
                                    {(balanceBreakdown && balanceBreakdown.total > 0) ? (
                                      <div className="space-y-2 text-sm">
                                        <h4 className="font-semibold">Balance Breakdown</h4>
                                        
                                        {balanceBreakdown.rentDueDetails.map((rentDetail, index) => (
                                            <div key={`rent-${index}`} className="flex justify-between items-center">
                                                <span className="text-muted-foreground flex items-center gap-1.5"><Home className="w-4 h-4" /> Rent ({rentDetail.month})</span>
                                                <span>₱{formatCurrency(rentDetail.rate)}</span>
                                            </div>
                                        ))}

                                        {balanceBreakdown.unpaidDues.map(due => (
                                          <div key={due.id} className="flex justify-between items-center">
                                              <span className="text-muted-foreground flex items-center gap-1.5"><ListPlus className="w-4 h-4" /> {due.type}</span>
                                              <span>₱{formatCurrency(due.amount)}</span>
                                          </div>
                                        ))}
                                        
                                        {(balanceBreakdown.rentDueDetails.length > 0 || balanceBreakdown.unpaidDues.length > 0) && (
                                            <Separator className="my-2"/>
                                        )}
                                        
                                        <div className="flex justify-between items-center font-bold">
                                          <span>Total Due</span>
                                          <span>₱{formatCurrency(balanceBreakdown.total)}</span>
                                        </div>

                                      </div>
                                    ) : (
                                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                                          <span>This tenant is fully paid up. No outstanding dues.</span>
                                        </div>
                                    )}
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
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
                              <Send className="mr-1 h-4 w-4"/>
                              Use
                            </Button>
                          </div>
                        </div>
                       </div>
                    )}
                </div>
              )}
              
              <div className="space-y-4">
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
                          <Input type="number" step="0.01" placeholder="e.g. 500" {...field} className="pl-7" autoComplete="off"/>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {canApplyDiscount && !showDiscountFields && (
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => setShowDiscountFields(true)}
                        disabled={isEditing}
                    >
                        <PercentCircle className="mr-2 h-4 w-4" />
                        Apply Discount
                    </Button>
                )}

                {showDiscountFields && (
                    <div className="space-y-4 p-4 border rounded-md bg-muted/50">
                        <div className="flex justify-between items-center mb-2">
                            <FormLabel>Discount Details</FormLabel>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleCancelDiscount}
                                className="h-auto px-2 py-1 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                                <MinusCircle className="mr-1 h-3 w-3" />
                                Cancel Discount
                            </Button>
                        </div>
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
                                    <Input type="number" step="0.01" placeholder="e.g. 50" {...field} className="pl-7 bg-background" autoComplete="off"/>
                                </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="discountDescription"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Discount Description</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="e.g., Early payment incentive, Loyalty bonus" {...field} autoComplete="off" className="bg-background" />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Payment Date</FormLabel>
                      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
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
                            onSelect={(date) => {
                              field.onChange(date);
                              setIsCalendarOpen(false);
                            }}
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
                      <FormLabel>{currentAmountPaid > 0 ? 'Payment Method' : 'Payment Method (Not applicable)'}</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value} 
                        defaultValue={field.value}
                        disabled={currentAmountPaid === 0}
                      >
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
              </div>

              {watchedPaymentMethod === 'Check' && (
                  <FormField
                    control={form.control}
                    name="checkNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Check Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter check number" {...field} autoComplete="off" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

              {!isEditing && transactionSummary && selectedTenantId && (balanceBreakdown !== null) && (
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
                <Button type="submit" variant="default" disabled={form.formState.isSubmitting}>{isEditing ? 'Save Changes' : 'Record Payment'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {isApplyDepositOpen && selectedTenant && balanceBreakdown !== null && (
        <ApplyDepositDialog
          isOpen={isApplyDepositOpen}
          onClose={() => setIsApplyDepositOpen(false)}
          tenant={selectedTenant}
          currentBalance={balanceBreakdown.total}
        />
      )}
    </>
  );
}
