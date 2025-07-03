
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription as ShadcnCardDescription } from '@/components/ui/card';
import { ClipboardPlus, PlusCircle, FileText, Loader2 } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { generateContract } from '@/ai/flows/generate-contract-flow';

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
  { label: 'Tenant Name', tag: '{{{tenant_name}}}' },
  { label: 'Monthly Rate', tag: '{{{monthly_rate}}}' },
  { label: 'Security Deposit', tag: '{{{security_deposit}}}' },
  { label: 'Join Date', tag: '{{{join_date}}}' },
  { label: 'Landlord Name', tag: '{{{landlord_name}}}' },
  { label: 'Tenant Signature Block', tag: '{{{tenant_signature_block}}}' },
  { label: 'Tenant Manual Input', tag: '{{{tenant_manual_input}}}' },
];

export function ContractTemplateForm({ isOpen, onClose, template }: ContractTemplateFormProps) {
  const { addContractTemplate, updateContractTemplate } = useAppContext();
  const { toast } = useToast();
  const isEditing = !!template;
  
  const bodyTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const cursorPositionRef = useRef<number>(0);

  const [selectedPlaceholder, setSelectedPlaceholder] = useState('');
  const [previewContent, setPreviewContent] = useState<string>('');
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);

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
      setPreviewContent('');
      setIsPreviewLoading(false);
      cursorPositionRef.current = 0;
    }
  }, [isOpen, template, form]);

  const handleCursorChange = (event: React.SyntheticEvent<HTMLTextAreaElement>) => {
      cursorPositionRef.current = event.currentTarget.selectionStart;
  };

  const handleAddPlaceholder = () => {
    if (!selectedPlaceholder) return;
    const textarea = bodyTextareaRef.current;
    if (!textarea) return;

    const currentValue = form.getValues('body') || '';
    const cursorPosition = cursorPositionRef.current;

    const newValue =
        currentValue.substring(0, cursorPosition) +
        selectedPlaceholder +
        currentValue.substring(cursorPosition);

    form.setValue('body', newValue, { shouldValidate: true, shouldDirty: true });

    setTimeout(() => {
        textarea.focus();
        const newCursorPosition = cursorPosition + selectedPlaceholder.length;
        textarea.setSelectionRange(newCursorPosition, newCursorPosition);
        cursorPositionRef.current = newCursorPosition;
    }, 0);
  };
  
  const handlePreview = async () => {
    const templateBody = form.getValues('body');
    if (!templateBody) {
      toast({ variant: 'destructive', title: 'Error', description: 'Template body cannot be empty to generate a preview.' });
      return;
    }

    setIsPreviewLoading(true);
    setPreviewContent('');
    
    const mockData = {
      templateBody,
      tenant_name: "Jane Doe (Sample)",
      monthly_rate: 15000,
      security_deposit: 30000,
      join_date: "July 1, 2024",
      landlord_name: "John Smith (Landlord)",
    };

    try {
      const result = await generateContract(mockData);
      setPreviewContent(result.finalContract);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Preview Failed', description: e.message || "An AI error occurred." });
    } finally {
      setIsPreviewLoading(false);
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
      <DialogContent className="max-w-7xl flex flex-col h-full max-h-[95vh]">
        <DialogHeader className="flex-shrink-0 p-6 pb-4 border-b">
          <DialogTitle>{isEditing ? 'Edit Contract Template' : 'Create New Contract Template'}</DialogTitle>
          <DialogDescription>
            {"Use the placeholder palette to insert dynamic fields. Use the preview panel to see a sample of the generated contract."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 grid grid-cols-2 gap-6 p-6 overflow-y-auto">
              
              {/* Left Column: Editor */}
              <div className="col-span-1 flex flex-col space-y-4">
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
                          onBlur={(e) => {
                            field.onBlur(e);
                            handleCursorChange(e);
                          }}
                          onClick={handleCursorChange}
                          onKeyUp={handleCursorChange}
                          onChange={field.onChange}
                          name={field.name}
                          value={field.value}
                          placeholder="This Residential Lease Agreement is made on..."
                          className="h-full resize-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <ClipboardPlus className="w-5 h-5"/>
                            Placeholders
                        </CardTitle>
                        <ShadcnCardDescription>
                            Select a field and click the plus button to add it where your cursor is.
                        </ShadcnCardDescription>
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
                                            {p.label}
                                          </SelectItem>
                                      ))}
                                  </SelectContent>
                              </Select>
                          </div>
                          <Button
                              type="button"
                              size="icon"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleAddPlaceholder();
                              }}
                              disabled={!selectedPlaceholder}
                              aria-label="Add placeholder"
                          >
                              <PlusCircle className="h-5 w-5"/>
                          </Button>
                      </div>
                    </CardContent>
                </Card>
              </div>

              {/* Right Column: Preview */}
              <div className="col-span-1 flex flex-col">
                 <Card className="flex-1 flex flex-col">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="w-5 h-5"/>
                            Preview
                        </CardTitle>
                        <ShadcnCardDescription>
                           Click "Generate Preview" to see an example of the rendered contract.
                        </ShadcnCardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-0">
                        <ScrollArea className="h-full border rounded-md p-4 bg-muted/50 whitespace-pre-wrap">
                            {isPreviewLoading && (
                                <div className="flex items-center justify-center h-full">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            )}
                            {!isPreviewLoading && !previewContent && (
                                <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                                    <p>Preview will appear here.</p>
                                </div>
                            )}
                            {!isPreviewLoading && previewContent && (
                                <p>{previewContent}</p>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>
              </div>
            </div>

            <DialogFooter className="flex-shrink-0 p-6 pt-4 border-t flex items-center justify-between">
              <Button type="button" variant="secondary" onClick={handlePreview} disabled={isPreviewLoading}>
                {isPreviewLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                Generate Preview
              </Button>
              <div className="flex gap-2">
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit">{isEditing ? 'Save Template' : 'Create Template'}</Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
