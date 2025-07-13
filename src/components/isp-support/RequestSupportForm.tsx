"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';
import { Loader2, Send, Paperclip, X } from 'lucide-react';
import type { IssueCategory } from '@/lib/types';
import { issueCategories } from '@/lib/types';

const requestFormSchema = z.object({
  issueType: z.enum(issueCategories as [IssueCategory, ...IssueCategory[]], {
    required_error: "Please select an issue category.",
  }),
  description: z.string().min(10, "Description must be at least 10 characters.").max(500, "Description is too long."),
  attachments: z.custom<FileList>().optional(),
});

type FormValues = z.infer<typeof requestFormSchema>;

export function RequestSupportForm() {
  const { addTechSupportRequest } = useAppContext();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(requestFormSchema),
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFiles(Array.from(event.target.files));
    }
  };

  const removeFile = (indexToRemove: number) => {
    setFiles(files.filter((_, index) => index !== indexToRemove));
  };
  
  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      await addTechSupportRequest({
        issueType: data.issueType,
        description: data.description,
      }, files);
      toast({ title: "Support Request Sent", description: "Your request has been submitted successfully." });
      form.reset();
      setFiles([]);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Submission Failed', description: error.message || "An unknown error occurred." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="issueType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Issue Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {issueCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Describe Your Issue</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g., My internet connection has been dropping every few minutes..." {...field} rows={5} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
            control={form.control}
            name="attachments"
            render={({ field }) => (
            <FormItem>
                <FormLabel>Attachments (Optional)</FormLabel>
                <FormControl>
                    <div className="relative">
                        <Input id="attachments" type="file" multiple onChange={handleFileChange} className="pl-12" />
                        <Paperclip className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    </div>
                </FormControl>
                <FormMessage />
            </FormItem>
            )}
        />
        {files.length > 0 && (
            <div className="space-y-2">
                <FormLabel>Selected Files:</FormLabel>
                <ul className="space-y-1 list-disc list-inside text-sm text-muted-foreground">
                {files.map((file, index) => (
                    <li key={index} className="flex items-center justify-between">
                    <span>{file.name}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeFile(index)}>
                        <X className="h-4 w-4" />
                    </Button>
                    </li>
                ))}
                </ul>
            </div>
        )}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Submit Request
        </Button>
      </form>
    </Form>
  );
}
