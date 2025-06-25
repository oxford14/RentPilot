
"use client";

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { BreakdownRule } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ManualInputDialogProps {
  isOpen: boolean;
  onClose: () => void;
  rules: BreakdownRule[];
  totalIncome: number;
  onSubmit: (manualValues: Record<string, number>) => void;
}

export function ManualInputDialog({ isOpen, onClose, rules, totalIncome, onSubmit }: ManualInputDialogProps) {
  // Dynamically create a Zod schema based on the rules that require manual input
  const manualInputSchema = React.useMemo(() => {
    const shape = rules.reduce((acc, rule) => {
      acc[rule.name] = z.coerce.number().min(0, "Amount must be a non-negative number.");
      return acc;
    }, {} as Record<string, z.ZodTypeAny>);
    return z.object(shape);
  }, [rules]);

  type FormValues = z.infer<typeof manualInputSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(manualInputSchema),
    defaultValues: rules.reduce((acc, rule) => ({ ...acc, [rule.name]: 0 }), {}),
  });

  useEffect(() => {
    if (isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  const handleFormSubmit = (data: FormValues) => {
    onSubmit(data);
  };

  const formatCurrency = (amount: number) => `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manual Input Required</DialogTitle>
          <DialogDescription>
            Please provide the values for the following breakdown items for the total income of <strong className="text-foreground">{formatCurrency(totalIncome)}</strong>.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} autoComplete="off">
            <ScrollArea className="max-h-[50vh] my-4 pr-4">
              <div className="space-y-4">
                {rules.map((rule) => (
                  <FormField
                    key={rule.id}
                    control={form.control}
                    name={rule.name as keyof FormValues}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{rule.name}</FormLabel>
                        <FormControl>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground">₱</span>
                                <Input type="number" step="0.01" placeholder="Enter amount" {...field} className="pl-8" />
                            </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </ScrollArea>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit">Continue Calculation</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
