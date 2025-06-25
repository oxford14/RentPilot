
"use client";

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ManagedUser, ClientUserRole } from '@/lib/types';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff } from 'lucide-react';

const clientUserRoles: ClientUserRole[] = ['admin', 'user'];

const managedUserFormSchema = z.object({
  username: z.string().min(3, { message: "Username must be at least 3 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().optional(),
  role: z.enum(clientUserRoles as [ClientUserRole, ...ClientUserRole[]], {
    required_error: "User role is required.",
  }),
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
  const [showPassword, setShowPassword] = useState(false);

  const defaultFormValues = React.useMemo(() => (
    user
      ? { username: user.username, email: user.email, password: '', role: user.role }
      : { username: '', email: '', password: '', role: 'user' as ClientUserRole }
  ), [user]);

  const form = useForm<ManagedUserFormValues>({
    resolver: zodResolver(managedUserFormSchema),
    defaultValues: defaultFormValues,
  });

  useEffect(() => {
    if (isOpen) {
      form.reset(
        user
          ? { username: user.username, email: user.email, password: '', role: user.role }
          : { username: '', email: '', password: '', role: 'user' as ClientUserRole }
      );
      setShowPassword(false);
    }
  }, [user, isOpen, form]);

  const onSubmit = (data: ManagedUserFormValues) => {
    try {
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

      if (data.password) {
        const existingUserWithSamePassword = rawManagedUsers.find(
          (mu) => mu.password === data.password && mu.id !== user?.id
        );
        if (existingUserWithSamePassword) {
          form.setError("password", { type: "manual", message: "Try a different password." });
          toast({ variant: "destructive", title: "Validation Error", description: "Try a different password." });
          return;
        }
      }
      
      const userDataPayload: Omit<ManagedUser, 'id'> & Partial<Pick<ManagedUser, 'id'>> = {
        username: data.username,
        email: data.email,
        clientId: targetClientId,
        role: data.role,
      };

      if (user) {
        if (data.password) {
          userDataPayload.password = data.password;
        }
        updateManagedUser({ ...user, ...userDataPayload, clientId: targetClientId, role: data.role });
        toast({ title: "User Updated", description: `${data.username} for ${targetClientName} has been updated.` });
      } else {
        userDataPayload.password = data.password!; // Password is required for new users (validated above)
        addManagedUser(userDataPayload as Omit<ManagedUser, 'id'>);
        toast({ title: "User Added", description: `${data.username} has been added to ${targetClientName}.` });
      }
      form.reset({ username: '', email: '', password: '', role: 'user' });
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
          <form onSubmit={form.handleSubmit(onSubmit)} autoComplete="off" className="space-y-6 p-2">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. client_admin" {...field} autoComplete="off" />
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
                    <Input type="email" placeholder="e.g. user@client.com" {...field} autoComplete="off" />
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
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clientUserRoles.map(roleValue => (
                        <SelectItem key={roleValue} value={roleValue}>
                          {roleValue.charAt(0).toUpperCase() + roleValue.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
