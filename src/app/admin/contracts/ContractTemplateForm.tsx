
"use client";

import React, { useEffect, useRef, useState } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ClipboardPlus, PlusCircle } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const templateFormSchema = z.object({
  name: z.string().min(3, "Template name must be at least 3 characters."),
  body: z.string().min(1, "Template body is required."),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

interface ContractTemplateFormProps {
  isOpen: boolean;
  onClose: () => void;
  template?: ContractTemplate | null;
}

const availablePlaceholders = [
  { label: 'Tenant Name', tag: '{{{tenant_name}}}', description: "The full name of the tenant." },
  { label: 'Monthly Rate', tag: '{{{monthly_rate}}}', description: "The tenant's monthly rental rate." },
  { label: 'Security Deposit', tag: '{{{security_deposit}}}', description: "The security deposit amount." },
  { label: 'Join Date', tag: '{{{join_date}}}', description: "The tenant's join date." },
  { label: 'Landlord Name', tag: '{{{landlord_name}}}', description: "The name of the landlord or manager." },
  { label: 'Tenant Signature Block', tag: '{{{tenant_signature_block}}}', description: "The block for the tenant's signature." },
  { label: 'Tenant Manual Input', tag: '{{{tenant_manual_input}}}', description: "A multi-line textbox for the tenant to fill." },
];

export function ContractTemplateForm({ isOpen, onClose, template }: ContractTemplateFormProps) {
  const { addContractTemplate, updateContractTemplate } = useAppContext();
  const isEditing = !!template;
  const bodyTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [selectedPlaceholder, setSelectedPlaceholder] = useState('');

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: '',
      body: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: template?.name || '',
        body: template?.body || '',
      });
      setSelectedPlaceholder('');
    }
  }, [isOpen, template, form]);

  const handleAddPlaceholder = () => {
    if (!selectedPlaceholder) return;
    const textarea = bodyTextareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentValue = form.getValues('body');
      const newValue = currentValue.substring(0, start) + selectedPlaceholder + currentValue.substring(end);
      form.setValue('body', newValue, { shouldValidate: true, shouldDirty: true });

      setTimeout(() => {
        textarea.focus();
        const newCursorPosition = start + selectedPlaceholder.length;
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
      <DialogContent className="max-w-4xl flex flex-col h-[90vh]">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>{isEditing ? 'Edit Contract Template' : 'Create New Contract Template'}</DialogTitle>
          <DialogDescription>
            {"Use the placeholder palette to insert dynamic fields into your contract body. The system will replace these tags with tenant data when initiated."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 grid grid-cols-3 gap-6 px-6 py-4 overflow-y-auto">
              
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
                  render={({ field }) => (
                    <FormItem className="flex-1 flex flex-col">
                      <FormLabel>Template Body</FormLabel>
                      <FormControl>
                         <Textarea 
                          ref={(e) => {
                            field.ref(e);
                            bodyTextareaRef.current = e;
                          }}
                          placeholder="This Residential Lease Agreement is made on..." 
                          className="h-full resize-none" 
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="col-span-1 flex flex-col">
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <ClipboardPlus className="w-5 h-5"/>
                            Placeholders
                        </CardTitle>
                        <CardDescription>
                            Select a field and click the plus button to add it.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-end gap-2">
                          <div className="flex-grow">
                              <Label>Placeholder</Label>
                               <Select onValueChange={(tag) => setSelectedPlaceholder(tag)} value={selectedPlaceholder}>
                                  <SelectTrigger>
                                      <SelectValue placeholder="Select a field..." />
                                  </SelectTrigger>
                                  <SelectContent position="item-aligned">
                                      {availablePlaceholders.map(p => (
                                          <SelectItem key={p.tag} value={p.tag}>
                                              <div className="flex flex-col items-start py-1">
                                                  <p className="font-semibold text-sm">{p.label}</p>
                                                  <p className="text-xs text-muted-foreground">{p.description}</p>
                                              </div>
                                          </SelectItem>
                                      ))}
                                  </SelectContent>
                              </Select>
                          </div>
                          <Button
                              type="button"
                              size="icon"
                              onClick={handleAddPlaceholder}
                              disabled={!selectedPlaceholder}
                              aria-label="Add placeholder"
                          >
                              <PlusCircle className="h-5 w-5"/>
                          </Button>
                      </div>
                    </CardContent>
                 </Card>
              </div>
            </div>

            <DialogFooter className="flex-shrink-0 p-6 pt-4 border-t">
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit">{isEditing ? 'Save Changes' : 'Create Template'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
