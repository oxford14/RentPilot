
"use client";

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { Client, ManagedUser } from '@/lib/types';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';

const managedUserFormSchema = z.object({
  username: z.string().min(3, { message: "Username must be at least 3 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  // clientId is not part of the form data, it's passed as a prop
});

type ManagedUserFormValues = z.infer<typeof managedUserFormSchema>;

interface ManagedUserFormProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client; // Client to whom the user is being added/edited
  user?: ManagedUser | null; // For editing
}

export function ManagedUserForm({ isOpen, onClose, client, user }: ManagedUserFormProps) {
  const { addManagedUser, updateManagedUser } = useAppContext(); 
  const { toast } = useToast();

  const form = useForm<ManagedUserFormValues>({
    resolver: zodResolver(managedUserFormSchema),
    defaultValues: user ? { username: user.username, email: user.email } : { username: '', email: '' },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset(user ? { username: user.username, email: user.email } : { username: '', email: '' });
    }
  }, [user, isOpen, form, client]);

  const onSubmit = (data: ManagedUserFormValues) => {
    try {
      if (user) {
        // Update existing user
        updateManagedUser({ ...user, ...data, clientId: client.id });
        toast({ title: "User Updated", description: `${data.username} for ${client.name} has been updated.` });
      } else {
        // Add new user
        addManagedUser({ ...data, clientId: client.id });
        toast({ title: "User Added", description: `${data.username} has been added to ${client.name}.` });
      }
      form.reset({ username: '', email: '' });
      onClose();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save user information." });
      console.error("Form submission error:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[450px] bg-card shadow-xl rounded-lg">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">
            {user ? `Edit User for ${client.name}` : `Add New User to ${client.name}`}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-2">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. client_admin" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="e.g. user@client.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              </DialogClose>
              <Button type="submit" variant="default">{user ? 'Save Changes' : 'Add User'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
