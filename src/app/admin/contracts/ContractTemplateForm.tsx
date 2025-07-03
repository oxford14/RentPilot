"use client";

import React, { useEffect, useRef } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardPlus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const templateFormSchema = z.object({
  name: z.string().min(3, "Template name must be at least 3 characters."),
  body: z.string().min(10, "Template body must be at least 10 characters."),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

interface ContractTemplateFormProps {
  isOpen: boolean;
  onClose: () => void;
  template?: ContractTemplate | null;
}

const availablePlaceholders = [
  { tag: '{{{tenant_name}}}', description: "The full name of the tenant." },
  { tag: '{{{monthly_rate}}}', description: "The tenant's monthly rental rate." },
  { tag: '{{{security_deposit}}}', description: "The security deposit amount." },
  { tag: '{{{join_date}}}', description: "The tenant's join date." },
  { tag: '{{{landlord_name}}}', description: "The name of the landlord or manager." },
  { tag: '{{{tenant_signature_block}}}', description: "The block where the tenant's digital signature will be placed." },
];

export function ContractTemplateForm({ isOpen, onClose, template }: ContractTemplateFormProps) {
  const { addContractTemplate, updateContractTemplate } = useAppContext();
  const isEditing = !!template;
  const bodyTextareaRef = useRef<HTMLTextAreaElement | null>(null);

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

  const handleInsertPlaceholder = (tag: string) => {
    const textarea = bodyTextareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentValue = form.getValues('body');
      const newValue = currentValue.substring(0, start) + tag + currentValue.substring(end);
      form.setValue('body', newValue, { shouldValidate: true, shouldDirty: true });

      // Focus and set cursor position after the inserted tag
      setTimeout(() => {
        textarea.focus();
        const newCursorPosition = start + tag.length;
        textarea.selectionStart = newCursorPosition;
        textarea.selectionEnd = newCursorPosition;
      }, 0);
    }
  };

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
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Contract Template' : 'Create New Contract Template'}</DialogTitle>
          <DialogDescription>
            {"Use the placeholder palette to insert dynamic fields into your contract body. The system will replace these tags with tenant data when initiated."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0 space-y-4">
             <div className="grid grid-cols-3 gap-6 flex-1 min-h-0">
               {/* Left column for form fields */}
               <div className="col-span-2 flex flex-col space-y-4">
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
                    render={({ field }) => {
                        const { ref: fieldRef, ...fieldProps } = field;
                        return (
                          <FormItem className="flex-1 flex flex-col">
                            <FormLabel>Template Body</FormLabel>
                            <FormControl>
                              <Textarea 
                                ref={(el) => {
                                    fieldRef(el);
                                    bodyTextareaRef.current = el;
                                }}
                                placeholder="This Residential Lease Agreement is made on..." 
                                {...fieldProps} 
                                className="flex-1 resize-none" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        );
                    }}
                  />
               </div>
               {/* Right column for placeholders */}
               <div className="col-span-1 flex flex-col min-h-0">
                 <Card className="flex flex-col flex-1">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <ClipboardPlus className="w-5 h-5"/>
                            Placeholders
                        </CardTitle>
                    </CardHeader>
                    <ScrollArea className="flex-1">
                        <CardContent className="space-y-2 p-4 pt-0">
                            {availablePlaceholders.map(p => (
                                <div key={p.tag} className="p-2 border rounded-md bg-muted/50">
                                    <div className="flex justify-between items-center">
                                        <p className="font-mono text-xs text-primary">{p.tag}</p>
                                        <Button type="button" size="sm" variant="ghost" onClick={() => handleInsertPlaceholder(p.tag)}>
                                            Insert
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
                                </div>
                            ))}
                        </CardContent>
                    </ScrollArea>
                 </Card>
               </div>
             </div>
            <DialogFooter className="flex-shrink-0 pt-4">
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit">{isEditing ? 'Save Changes' : 'Create Template'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
