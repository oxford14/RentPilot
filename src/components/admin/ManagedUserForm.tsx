
"use client";

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { ManagedUser } from '@/lib/types';
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
  targetClientId: string; 
  targetClientName: string; 
  user?: ManagedUser | null; 
}

export function ManagedUserForm({ isOpen, onClose, targetClientId, targetClientName, user }: ManagedUserFormProps) {
  const { addManagedUser, updateManagedUser, rawManagedUsers } = useAppContext(); 
  const { toast } = useToast();

  const form = useForm<ManagedUserFormValues>({
    resolver: zodResolver(managedUserFormSchema),
    defaultValues: user ? { username: user.username, email: user.email, password: '' } : { username: '', email: '', password: '' },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset(user ? { username: user.username, email: user.email, password: '' } : { username: '', email: '', password: '' });
    }
  }, [user, isOpen, form, targetClientId]);

  const onSubmit = (data: ManagedUserFormValues) => {
    try {
      // Password validation for new users or when password is being changed
      if (!user && (!data.password || data.password.length < 6)) {
        form.setError("password", { type: "manual", message: "Password is required and must be at least 6 characters." });
        toast({ variant: "destructive", title: "Validation Error", description: "Password is required and must be at least 6 characters."});
        return;
      }
      if (user && data.password && data.password.length < 6) {
        form.setError("password", { type: "manual", message: "New password must be at least 6 characters." });
        toast({ variant: "destructive", title: "Validation Error", description: "New password must be at least 6 characters." });
        return;
      }

      // Globally unique password check (if password is provided)
      if (data.password) {
        const existingUserWithSamePassword = rawManagedUsers.find(
          (mu) => mu.password === data.password && mu.id !== user?.id
        );
        if (existingUserWithSamePassword) {
          form.setError("password", { type: "manual", message: "This password is already in use globally. Please choose a different one." });
          toast({ variant: "destructive", title: "Validation Error", description: "This password is already in use globally. Please choose a different one." });
          return;
        }
      }

      const userDataPayload: Omit<ManagedUser, 'id'> & Partial<Pick<ManagedUser, 'id'>> = {
        username: data.username,
        email: data.email,
        clientId: targetClientId, 
      };

      if (user) { // Editing existing user
        if (data.password) { 
          userDataPayload.password = data.password;
        }
        // If password is not provided for an existing user, it's not included in userDataPayload, so AppContext won't update it
        updateManagedUser({ ...user, ...userDataPayload, clientId: targetClientId }); 
        toast({ title: "User Updated", description: `${data.username} for ${targetClientName} has been updated.` });
      } else { // Adding new user
        userDataPayload.password = data.password; // Password is required for new users (validated above)
        addManagedUser(userDataPayload as Omit<ManagedUser, 'id'>); 
        toast({ title: "User Added", description: `${data.username} has been added to ${targetClientName}.` });
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
            {user ? `Edit User for ${targetClientName}` : `Add New User to ${targetClientName}`}
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
                  <FormLabel>{user ? 'New Password (optional to change)' : 'Password'}</FormLabel>
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
