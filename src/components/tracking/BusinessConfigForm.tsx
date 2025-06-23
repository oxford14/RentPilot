
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { Business, BreakdownRule } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { ArrowUp, ArrowDown, PlusCircle, Trash2, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';

const breakdownRuleSchema = z.object({
    id: z.string(),
    name: z.string().min(1, "Rule name is required."),
    type: z.enum(['percentage', 'fixed']),
    value: z.coerce.number().min(0, "Value must be non-negative."),
});

const formSchema = z.object({
  breakdownConfig: z.array(breakdownRuleSchema),
});

type FormValues = z.infer<typeof formSchema>;

interface BusinessConfigFormProps {
  isOpen: boolean;
  onClose: () => void;
  business: Business;
  onSave: (updatedBusiness: Business) => void;
}

export function BusinessConfigForm({ isOpen, onClose, business, onSave }: BusinessConfigFormProps) {
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      breakdownConfig: business.breakdownConfig || [],
    },
  });
  
  const { fields, append, remove, swap } = useFieldArray({
    control: form.control,
    name: "breakdownConfig",
  });

  useEffect(() => {
    if (business) {
      form.reset({
        breakdownConfig: business.breakdownConfig || [],
      });
    }
  }, [business, form]);
  
  const onSubmit = (data: FormValues) => {
    const updatedBusiness = { ...business, breakdownConfig: data.breakdownConfig };
    onSave(updatedBusiness);
    toast({ title: "Configuration Saved", description: `Breakdown rules for ${business.name} have been updated.` });
    onClose();
  };
  
  const handleMove = (fromIndex: number, toIndex: number) => {
    if (toIndex >= 0 && toIndex < fields.length) {
      swap(fromIndex, toIndex);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Settings className="w-6 h-6"/> Breakdown Configuration for {business.name}</DialogTitle>
          <DialogDescription>
            Define the rules for the weekly income breakdown. Rules are applied sequentially.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <ScrollArea className="max-h-[50vh] pr-4">
                <div className="space-y-4">
                {fields.map((field, index) => (
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
                                    <Input type="number" placeholder="e.g., 50 or 1000" {...field} />
                                </FormControl>
                                <FormMessage />
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
                ))}
                </div>
            </ScrollArea>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => append({ id: uuidv4(), name: '', type: 'percentage', value: 0 })}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Rule
            </Button>
            
            <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit">Save Configuration</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
