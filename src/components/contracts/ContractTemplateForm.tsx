
"use client";

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { ContractTemplate } from '@/lib/types';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  name: z.string().min(3, "Template name must be at least 3 characters."),
  content: z.string().min(50, "Contract content must be at least 50 characters."),
});

type FormValues = z.infer<typeof formSchema>;

interface ContractTemplateFormProps {
  isOpen: boolean;
  onClose: () => void;
  template?: ContractTemplate | null;
}

export function ContractTemplateForm({ isOpen, onClose, template }: ContractTemplateFormProps) {
  const { addContractTemplate, updateContractTemplate } = useAppContext();
  const { toast } = useToast();
  const isEditing = !!template;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: template ? { name: template.name, content: template.content } : { name: '', content: '' },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset(template ? { name: template.name, content: template.content } : { name: '', content: '' });
    }
  }, [template, isOpen, form]);

  const onSubmit = (data: FormValues) => {
    try {
      if (isEditing && template) {
        updateContractTemplate({ ...template, ...data });
        toast({ title: "Template Updated" });
      } else {
        addContractTemplate(data);
        toast({ title: "Template Added" });
      }
      onClose();
    } catch (error: any) {
      console.error("Template form submission error:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to save template." });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Contract Template' : 'Add New Contract Template'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Standard 1-Year Lease" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter the full text of your contract here. Use placeholders like [TENANT_NAME], [LANDLORD_NAME], [START_DATE], etc."
                      {...field}
                      rows={15}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit">{isEditing ? 'Save Changes' : 'Add Template'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
