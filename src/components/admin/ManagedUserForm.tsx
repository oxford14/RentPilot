
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
  password: z.string().optional(),
});

type ManagedUserFormValues = z.infer<typeof managedUserFormSchema>;

interface ManagedUserFormProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client; 
  user?: ManagedUser | null; 
}

export function ManagedUserForm({ isOpen, onClose, client, user }: ManagedUserFormProps) {
  const { addManagedUser, updateManagedUser, managedUsers } = useAppContext(); 
  const { toast } = useToast();

  const form = useForm<ManagedUserFormValues>({
    resolver: zodResolver(managedUserFormSchema),
    defaultValues: user ? { username: user.username, email: user.email, password: '' } : { username: '', email: '', password: '' },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset(user ? { username: user.username, email: user.email, password: '' } : { username: '', email: '', password: '' });
    }
  }, [user, isOpen, form, client]);

  const onSubmit = (data: ManagedUserFormValues) => {
    try {
      // Check for duplicate username within the same client
      const existingUserWithSameUsername = managedUsers.find(
        (mu) => mu.clientId === client.id && mu.username.toLowerCase() === data.username.toLowerCase() && mu.id !== user?.id
      );

      if (existingUserWithSameUsername) {
        form.setError("username", { type: "manual", message: "Username already exists for this client." });
        toast({ variant: "destructive", title: "Validation Error", description: "Username already exists for this client." });
        return;
      }

      const userDataPayload: Omit<ManagedUser, 'id'> & Partial<Pick<ManagedUser, 'id'>> = {
        username: data.username,
        email: data.email,
        clientId: client.id,
      };

      if (user) { // Editing existing user
        if (data.password) { // If password field has a value
          if (data.password.length < 6) {
            form.setError("password", { type: "manual", message: "New password must be at least 6 characters." });
            toast({ variant: "destructive", title: "Validation Error", description: "New password must be at least 6 characters." });
            return;
          }
          userDataPayload.password = data.password;
        }
        updateManagedUser({ ...user, ...userDataPayload });
        toast({ title: "User Updated", description: `${data.username} for ${client.name} has been updated.` });
      } else { // Adding new user
        if (!data.password || data.password.length < 6) {
          form.setError("password", { type: "manual", message: "Password is required and must be at least 6 characters." });
          toast({ variant: "destructive", title: "Validation Error", description: "Password is required and must be at least 6 characters."});
          return;
        }
        userDataPayload.password = data.password;
        addManagedUser(userDataPayload as Omit<ManagedUser, 'id'>);
        toast({ title: "User Added", description: `${data.username} has been added to ${client.name}.` });
      }
      form.reset({ username: '', email: '', password: '' });
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
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{user ? 'New Password (optional)' : 'Password'}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
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
