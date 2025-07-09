
"use client";

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { CompanyFundsExpense } from '@/lib/types';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const expenseFormSchema = z.object({
  description: z.string().min(3, { message: "Description must be at least 3 characters." }).max(200, { message: "Description must be 200 characters or less." }),
  amount: z.coerce.number().positive({ message: "Amount must be a positive number." }),
  date: z.date({ required_error: "Expense date is required." }),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

interface CompanyFundsExpenseFormProps {
  isOpen: boolean;
  onClose: () => void;
  expense?: CompanyFundsExpense | null;
}

export function CompanyFundsExpenseForm({ isOpen, onClose, expense }: CompanyFundsExpenseFormProps) {
  const { addCompanyFundsExpense, updateCompanyFundsExpense } = useAppContext();
  const { toast } = useToast();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const defaultValues = React.useMemo(() => {
    return expense
      ? { ...expense, date: new Date(expense.date), amount: Number(expense.amount) }
      : {
          description: '',
          amount: 0,
          date: new Date(),
        };
  }, [expense]);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (isOpen) {
      form.reset(defaultValues);
    }
  }, [isOpen, defaultValues, form]);

  const onSubmit = (data: ExpenseFormValues) => {
    try {
      const expenseDataPayload = {
        ...data,
        date: data.date.toISOString(),
      };

      if (expense) {
        updateCompanyFundsExpense({ ...expense, ...expenseDataPayload });
        toast({ title: "Expense Updated", description: "The expense has been updated." });
      } else {
        addCompanyFundsExpense(expenseDataPayload);
        toast({ title: "Expense Added", description: "The new expense has been added." });
      }
      onClose();
    } catch (error) {
      console.error("Expense form submission error:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to save expense." });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-card shadow-xl rounded-lg">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl">{expense ? 'Edit Expense' : 'Add New Company Fund Expense'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} autoComplete="off" className="space-y-4 p-1">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Team lunch, office supplies" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (₱)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground">₱</span>
                        <Input type="number" step="0.01" placeholder="e.g., 1500.00" {...field} className="pl-7" />
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
                  <FormItem className="flex flex-col pt-2">
                    <FormLabel>Date of Expense</FormLabel>
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
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
                          disabled={(date) => date > new Date() || date < new Date("2000-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              </DialogClose>
              <Button type="submit" variant="default">{expense ? 'Save Changes' : 'Add Expense'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
