
"use client";

import React, { useEffect, useRef } from 'react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Code } from 'lucide-react';

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

const placeholders = [
  { value: '[TENANT_NAME]', label: 'Tenant Name' },
  { value: '[LANDLORD_NAME]', label: 'Landlord/Company Name' },
  { value: '[PROPERTY_ADDRESS]', label: 'Property Address' },
  { value: '[START_DATE]', label: 'Contract Start Date' },
  { value: '[END_DATE]', label: 'Contract End Date' },
  { value: '[CONTRACT_TERM]', label: 'Contract Term (e.g., 1 year)' },
  { value: '[RENT_AMOUNT]', label: 'Monthly Rent Amount' },
  { value: '[DUE_DAY]', label: 'Rent Due Day of Month' },
  { value: '[SECURITY_DEPOSIT]', label: 'Security Deposit Amount' },
  { value: '[DATE]', label: 'Current Date (of signing)' },
  { value: '[TENANT_SIGNATURE]', label: 'Tenant Signature Area' },
  { value: '[LANDLORD_SIGNATURE]', label: 'Landlord Signature Area' },
];

export function ContractTemplateForm({ isOpen, onClose, template }: ContractTemplateFormProps) {
  const { addContractTemplate, updateContractTemplate } = useAppContext();
  const { toast } = useToast();
  const isEditing = !!template;
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: template ? { name: template.name, content: template.content } : { name: '', content: '' },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset(template ? { name: template.name, content: template.content } : { name: '', content: '' });
    }
  }, [template, isOpen, form]);

  const handleInsertPlaceholder = (placeholder: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = form.getValues("content") || "";

    const newValue =
      currentValue.substring(0, start) +
      placeholder +
      currentValue.substring(end);
    
    form.setValue("content", newValue, { shouldDirty: true });

    // After re-render, focus and set cursor
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + placeholder.length;
      }
    }, 0);
  };

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
              render={({ field }) => {
                const { ref, ...restField } = field;
                return (
                  <FormItem>
                    <div className="flex justify-between items-center">
                      <FormLabel>Template Content</FormLabel>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" variant="outline" size="sm">
                            <Code className="mr-2 h-4 w-4" />
                            Insert Placeholder
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Available Placeholders</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {placeholders.map(p => (
                            <DropdownMenuItem key={p.value} onSelect={() => handleInsertPlaceholder(p.value)}>
                              {p.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <FormControl>
                      <Textarea
                        placeholder="Enter the full text of your contract here. Use the 'Insert Placeholder' button to add dynamic values."
                        rows={15}
                        {...restField}
                        ref={(e) => {
                            ref(e);
                            textareaRef.current = e;
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
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
