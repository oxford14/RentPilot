
"use client";

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { Client } from '@/lib/types';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';

const clientFormSchema = z.object({
  name: z.string().min(2, { message: "Client name must be at least 2 characters." }),
  logoUrl: z.string().url({ message: "Please enter a valid URL for the logo." }).optional().or(z.literal('')),
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

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: client ? { name: client.name, logoUrl: client.logoUrl || '' } : { name: '', logoUrl: '' },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset(client ? { name: client.name, logoUrl: client.logoUrl || '' } : { name: '', logoUrl: '' });
    }
  }, [client, isOpen, form]);

  const onSubmit = (data: ClientFormValues) => {
    try {
      const name = data.name;
      // If logoUrl from form is empty or just whitespace, set to null for Firestore. Otherwise, use the trimmed URL.
      const logoUrl = (data.logoUrl && data.logoUrl.trim() !== '') ? data.logoUrl.trim() : null;

      if (client) { // Editing existing client
        updateClient({ ...client, name, logoUrl });
        toast({ title: "Client Updated", description: `${name} has been updated successfully.` });
      } else { // Adding new client
        // addClient expects Omit<Client, 'id'>. If logoUrl is null, it's fine.
        addClient({ name, logoUrl });
        toast({ title: "Client Added", description: `${name} has been added successfully.` });
      }
      form.reset({ name: '', logoUrl: '' });
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
              name="logoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Logo URL (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. https://example.com/logo.png" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              </DialogClose>
              <Button type="submit" variant="default">{client ? 'Save Changes' : 'Add Client'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
