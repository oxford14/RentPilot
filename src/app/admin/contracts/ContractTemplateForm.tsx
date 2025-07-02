"use client";

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { ContractTemplate } from '@/lib/types';
import { useAppContext } from '@/contexts/AppContext';

const templateFormSchema = z.object({
  name: z.string().min(3, "Template name must be at least 3 characters."),
  body: z.string().min(50, "Template body must be at least 50 characters."),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

interface ContractTemplateFormProps {
  isOpen: boolean;
  onClose: () => void;
  template?: ContractTemplate | null;
}

export function ContractTemplateForm({ isOpen, onClose, template }: ContractTemplateFormProps) {
  const { addContractTemplate, updateContractTemplate } = useAppContext();
  const isEditing = !!template;

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: template?.name || '',
      body: template?.body || '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: template?.name || '',
        body: template?.body || '',
      });
    }
  }, [isOpen, template, form]);

  const onSubmit = (data: TemplateFormValues) => {
    if (isEditing && template) {
      updateContractTemplate({ ...template, ...data });
    } else {
      addContractTemplate(data);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Contract Template' : 'Create New Contract Template'}</DialogTitle>
          <DialogDescription>
            {"Use Handlebars syntax '{{{placeholder}}}' for dynamic fields. Available placeholders: 'tenant_name', 'monthly_rate', 'security_deposit', 'join_date'."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0 space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Standard 12-Month Lease" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem className="flex-1 flex flex-col min-h-0">
                  <FormLabel>Template Body</FormLabel>
                  <FormControl>
                    <Textarea placeholder="This Residential Lease Agreement is made on..." {...field} className="flex-1 resize-none" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="flex-shrink-0">
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit">{isEditing ? 'Save Changes' : 'Create Template'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
