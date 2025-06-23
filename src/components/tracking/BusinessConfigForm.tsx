
"use client";

import React, { useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import type { Business, BreakdownRule } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { ArrowUp, ArrowDown, PlusCircle, Trash2, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';

const breakdownRuleSchema = z.object({
    id: z.string(),
    name: z.string().min(1, "Rule name is required."),
    type: z.enum(['percentage', 'fixed', 'manual_input']),
    value: z.coerce.number().min(0, "Value must be non-negative."),
});

const formSchema = z.object({
  breakdownConfig: z.array(breakdownRuleSchema),
  trackingFrequency: z.enum(['daily', 'weekly', 'monthly']),
  weeklyDay: z.coerce.number().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface BusinessConfigFormProps {
  isOpen: boolean;
  onClose: () => void;
  business: Business;
  onSave: (updatedBusiness: Business) => void;
}

const weekDays = [
    { label: 'Sunday', value: 0 },
    { label: 'Monday', value: 1 },
    { label: 'Tuesday', value: 2 },
    { label: 'Wednesday', value: 3 },
    { label: 'Thursday', value: 4 },
    { label: 'Friday', value: 5 },
    { label: 'Saturday', value: 6 },
];

export function BusinessConfigForm({ isOpen, onClose, business, onSave }: BusinessConfigFormProps) {
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      breakdownConfig: business.breakdownConfig || [],
      trackingFrequency: business.trackingFrequency || 'weekly',
      weeklyDay: business.weeklyDay ?? 5, // Default to Friday
    },
  });
  
  const { fields, append, remove, swap } = useFieldArray({
    control: form.control,
    name: "breakdownConfig",
  });

  const watchFrequency = form.watch('trackingFrequency');

  useEffect(() => {
    if (business && isOpen) {
      form.reset({
        breakdownConfig: business.breakdownConfig || [],
        trackingFrequency: business.trackingFrequency || 'weekly',
        weeklyDay: business.weeklyDay ?? 5,
      });
    }
  }, [business, isOpen, form]);
  
  const onSubmit = (data: FormValues) => {
    const updatedBusinessData = { 
        ...business, 
        breakdownConfig: data.breakdownConfig,
        trackingFrequency: data.trackingFrequency,
        weeklyDay: data.weeklyDay,
    };
    if (data.trackingFrequency !== 'weekly') {
        delete updatedBusinessData.weeklyDay;
    }
    onSave(updatedBusinessData);
    toast({ title: "Configuration Saved", description: `Configuration for ${business.name} has been updated.` });
    onClose();
  };
  
  const handleMove = (fromIndex: number, toIndex: number) => {
    if (toIndex >= 0 && toIndex < fields.length) {
      swap(fromIndex, toIndex);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl flex flex-col max-h-[90vh]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2"><Settings className="w-6 h-6"/> Configuration for {business.name}</DialogTitle>
          <DialogDescription>
            Define the income tracking frequency and the rules for the breakdown. Rules are applied sequentially.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow overflow-y-hidden flex flex-col">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
                <FormField
                    control={form.control}
                    name="trackingFrequency"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Income Frequency</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                {watchFrequency === 'weekly' && (
                    <FormField
                        control={form.control}
                        name="weeklyDay"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Day of the Week</FormLabel>
                                <Select onValueChange={(val) => field.onChange(Number(val))} defaultValue={String(field.value)}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select day" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {weekDays.map(day => (
                                            <SelectItem key={day.value} value={String(day.value)}>{day.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
            </div>
            
            <Separator className="mb-4" />

            <FormLabel>Breakdown Rules</FormLabel>
            <ScrollArea className="flex-grow pr-4 -mr-6 -ml-6 px-6 my-2">
                <div className="space-y-4">
                {fields.map((field, index) => {
                    const ruleType = form.watch(`breakdownConfig.${index}.type`);
                    return (
                        <div key={field.id} className="flex items-start gap-2 p-3 border rounded-lg bg-muted/50 relative">
                        <div className="flex-grow grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <FormField
                                control={form.control}
                                name={`breakdownConfig.${index}.name`}
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Rule Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., ROI, Tithes" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name={`breakdownConfig.${index}.type`}
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                                        <SelectItem value="fixed">Fixed Amount (₱)</SelectItem>
                                        <SelectItem value="manual_input">Manual Input</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name={`breakdownConfig.${index}.value`}
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Value</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="e.g., 50 or 1000" {...field} disabled={ruleType === 'manual_input'} />
                                    </FormControl>
                                    {ruleType === 'manual_input' ? (
                                        <FormDescription className="text-xs">Value is ignored for Manual Input.</FormDescription>
                                    ) : (
                                        <FormMessage />
                                    )}
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="flex flex-col gap-1 pt-7">
                            <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => handleMove(index, index - 1)} disabled={index === 0}>
                                <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => handleMove(index, index + 1)} disabled={index === fields.length - 1}>
                                <ArrowDown className="h-4 w-4" />
                            </Button>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                        </div>
                    );
                })}
                </div>
            </ScrollArea>
            
            <div className="flex-shrink-0 pt-4 border-t mt-auto">
                <Button
                type="button"
                variant="outline"
                className="w-full mb-4"
                onClick={() => append({ id: uuidv4(), name: '', type: 'percentage', value: 0 })}
                >
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Rule
                </Button>

                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                    <Button type="submit">Save Configuration</Button>
                </DialogFooter>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
