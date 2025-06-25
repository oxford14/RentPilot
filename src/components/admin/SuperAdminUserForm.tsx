
"use client";

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { SuperAdminUser } from '@/lib/types';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff } from 'lucide-react';

const superAdminUserFormSchema = z.object({
  username: z.string().min(3, { message: "Username must be at least 3 characters." })
             .refine(username => username.toLowerCase() !== 'admin', { message: "Username 'admin' is reserved." }),
  password: z.string().optional(), 
});

type SuperAdminUserFormValues = z.infer<typeof superAdminUserFormSchema>;

interface SuperAdminUserFormProps {
  isOpen: boolean;
  onClose: () => void;
  user?: SuperAdminUser | null;
}

export function SuperAdminUserForm({ isOpen, onClose, user }: SuperAdminUserFormProps) {
  const { addSuperAdminUser, updateSuperAdminUser, rawSuperAdminUsers } = useAppContext();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<SuperAdminUserFormValues>({
    resolver: zodResolver(superAdminUserFormSchema),
    defaultValues: user ? { username: user.username, password: '' } : { username: '', password: '' },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset(user ? { username: user.username, password: '' } : { username: '', password: '' });
      setShowPassword(false);
    }
  }, [user, isOpen, form]);

  const onSubmit = (data: SuperAdminUserFormValues) => {
    try {
      // Password validation
      if (!user && (!data.password || data.password.length < 6)) {
        form.setError("password", { type: "manual", message: "Password is required and must be at least 6 characters." });
        toast({ variant: "destructive", title: "Validation Error", description: "Password is required and must be at least 6 characters for new users."});
        return;
      }
      if (user && data.password && data.password.length > 0 && data.password.length < 6) {
        form.setError("password", { type: "manual", message: "New password must be at least 6 characters." });
        toast({ variant: "destructive", title: "Validation Error", description: "New password must be at least 6 characters." });
        return;
      }

      // Username uniqueness validation (excluding current user if editing)
      const existingUserWithSameUsername = rawSuperAdminUsers.find(
        (sa) => sa.username.toLowerCase() === data.username.toLowerCase() && sa.id !== user?.id
      );
      if (existingUserWithSameUsername) {
        form.setError("username", { type: "manual", message: "This username is already taken by another super admin." });
        toast({ variant: "destructive", title: "Validation Error", description: "Username already exists." });
        return;
      }

      const userDataPayload: Partial<SuperAdminUser> = {
        username: data.username,
      };

      if (data.password) { // Only include password if provided
        userDataPayload.password = data.password;
      }

      if (user) { // Editing existing user
        updateSuperAdminUser({ ...user, ...userDataPayload });
        toast({ title: "Super Admin Updated", description: `${data.username} has been updated successfully.` });
      } else { // Adding new user
        if (!userDataPayload.password) { // Should have been caught by earlier validation, but as a safeguard
             form.setError("password", { type: "manual", message: "Password is required for new super admins." });
             return;
        }
        addSuperAdminUser(userDataPayload as Omit<SuperAdminUser, 'id'>);
        toast({ title: "Super Admin Added", description: `${data.username} has been added successfully.` });
      }
      form.reset({ username: '', password: '' });
      onClose();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save super admin information." });
      console.error("Form submission error:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] bg-card shadow-xl rounded-lg">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">{user ? 'Edit Super Admin' : 'Add New Super Admin'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} autoComplete="off" className="space-y-6 p-2">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. global_admin" {...field} disabled={!!user} autoComplete="off" />
                  </FormControl>
                  <FormMessage />
                  {user && <p className="text-xs text-muted-foreground pt-1">Username cannot be changed after creation.</p>}
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{user ? 'New Password (optional)' : 'Password'}</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} className="pr-10" autoComplete="off" />
                    </FormControl>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              </DialogClose>
              <Button type="submit" variant="default">{user ? 'Save Changes' : 'Add Super Admin'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
