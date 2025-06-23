
"use client";

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { Client } from '@/lib/types';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif"];

const clientFormSchema = z.object({
  name: z.string().min(2, { message: "Client name must be at least 2 characters." }),
  logoFile: z
    .any()
    .refine((files) => !files || files.length === 0 || files?.[0]?.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
      (files) => !files || files.length === 0 || ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type),
      "Only .jpg, .jpeg, .png and .gif formats are supported."
    ),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

interface ClientFormProps {
  isOpen: boolean;
  onClose: () => void;
  client?: Client | null; // For editing
}

export function ClientForm({ isOpen, onClose, client }: ClientFormProps) {
  const { addClient, updateClient } = useAppContext();
  const { toast } = useToast();
  const [preview, setPreview] = useState<string | null>(null);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: client?.name || '',
      logoFile: undefined,
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({ name: client?.name || '', logoFile: undefined });
      setPreview(client?.logoUrl || null);
    }
  }, [client, isOpen, form]);

  const onSubmit = async (data: ClientFormValues) => {
    try {
      const logoFile = data.logoFile?.[0];

      if (client) { // Editing existing client
        await updateClient({ ...client, name: data.name }, logoFile);
        toast({ title: "Client Updated", description: `${data.name} has been updated successfully.` });
      } else { // Adding new client
        await addClient({ name: data.name }, logoFile);
        toast({ title: "Client Added", description: `${data.name} has been added successfully.` });
      }
      onClose();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save client information." });
      console.error("Form submission error:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] bg-card shadow-xl rounded-lg">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">{client ? 'Edit Client' : 'Add New Client'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Acme Corp Rentals" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="logoFile"
              render={({ field: { onChange, value, ...rest } }) => (
                <FormItem>
                  <FormLabel>Client Logo</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept={ACCEPTED_IMAGE_TYPES.join(', ')}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        onChange(e.target.files);
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setPreview(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        } else {
                          setPreview(client?.logoUrl || null);
                        }
                      }}
                      {...rest}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {preview && (
              <div className="space-y-2">
                <FormLabel>Logo Preview</FormLabel>
                <div className="flex items-center justify-center p-4 border rounded-md bg-muted">
                    <Image src={preview} alt="Logo preview" width={120} height={45} className="object-contain" />
                </div>
              </div>
            )}

            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              </DialogClose>
              <Button type="submit" variant="default" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : (client ? 'Save Changes' : 'Add Client')}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
