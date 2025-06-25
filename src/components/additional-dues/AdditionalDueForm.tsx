
"use client";

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { type AdditionalDue, type AdditionalDueType, additionalDueTypes } from '@/lib/types';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const dueFormSchema = z.object({
  type: z.enum(additionalDueTypes as [AdditionalDueType, ...AdditionalDueType[]], { required_error: "Due type is required." }),
  amount: z.coerce.number().positive({ message: "Amount must be a positive number." }),
  dueDate: z.date({ required_error: "Due date is required." }),
  notes: z.string().max(200, { message: "Notes must be 200 characters or less." }).optional(),
  status: z.enum(['paid', 'unpaid']).optional(),
});

type DueFormValues = z.infer<typeof dueFormSchema>;

interface AdditionalDueFormProps {
  isOpen: boolean;
  onClose: () => void;
  due?: AdditionalDue | null;
  tenantId: string;
}

export function AdditionalDueForm({ isOpen, onClose, due, tenantId }: AdditionalDueFormProps) {
  const { addAdditionalDue, updateAdditionalDue } = useAppContext();
  const { toast } = useToast();
  const isEditing = !!due;
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const defaultValues = React.useMemo(() => {
    return due
      ? { ...due, dueDate: new Date(due.dueDate), amount: Number(due.amount), notes: due.notes || '' }
      : {
          type: undefined,
          amount: 0,
          dueDate: new Date(),
          notes: '',
          status: 'unpaid' as 'unpaid',
        };
  }, [due]);

  const form = useForm<DueFormValues>({
    resolver: zodResolver(dueFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (isOpen) {
      form.reset(defaultValues);
    }
  }, [isOpen, defaultValues, form]);

  const onSubmit = (data: DueFormValues) => {
    try {
      if (isEditing && due) {
        const payload: AdditionalDue = {
            ...due,
            ...data,
            dueDate: data.dueDate.toISOString(),
            status: data.status || due.status, // Keep original status if not changed
        };
        updateAdditionalDue(payload);
        toast({ title: "Due Updated", description: "The additional due has been updated." });
      } else {
        const payload = {
            ...data,
            tenantId: tenantId,
            dueDate: data.dueDate.toISOString(),
            status: 'unpaid' as const,
        };
        addAdditionalDue(payload);
        toast({ title: "Due Added", description: "The new charge has been added to the tenant." });
      }
      onClose();
    } catch (error) {
      console.error("Additional due form submission error:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to save the due." });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[525px] bg-card shadow-xl rounded-lg">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">{isEditing ? 'Edit Charge' : 'Add New Charge'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-2 max-h-[70vh] overflow-y-auto">
             <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type of Charge</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {additionalDueTypes.map(type => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                        <Input type="number" step="0.01" placeholder="e.g., 500.00" {...field} className="pl-8" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Due Date</FormLabel>
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")}
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
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Meter reading from..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isEditing && (
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
                                <FormControl><RadioGroupItem value="unpaid" /></FormControl>
                                <FormLabel className="font-normal">Unpaid</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl><RadioGroupItem value="paid" /></FormControl>
                                <FormLabel className="font-normal">Paid</FormLabel>
                            </FormItem>
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            )}
           
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              </DialogClose>
              <Button type="submit" variant="default">{isEditing ? 'Save Changes' : 'Add Charge'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
