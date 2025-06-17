
"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from '@/contexts/AuthContext';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { KeyRound, UserCog } from 'lucide-react';

const passwordChangeFormSchema = z.object({
  currentPassword: z.string().min(1, { message: "Current password is required." }),
  newPassword: z.string().min(6, { message: "New password must be at least 6 characters." }),
  confirmNewPassword: z.string(),
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: "New passwords don't match.",
  path: ["confirmNewPassword"],
});

type PasswordChangeFormValues = z.infer<typeof passwordChangeFormSchema>;

export default function UserAccountSettingsPage() {
  const { user: authUser } = useAuth();
  const { rawManagedUsers, updateManagedUser } = useAppContext();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeFormSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  if (!authUser || authUser.isSuperAdmin) {
    // Super admins manage their passwords elsewhere or it's hardcoded
    // This page is for ManagedUsers (client users/admins)
    if (typeof window !== 'undefined') { // Ensure router.push runs client-side
        toast({variant: "destructive", title: "Access Denied", description: "This page is for client user account settings."});
        router.push('/');
    }
    return <div className="container mx-auto py-2"><p>Redirecting...</p></div>;
  }

  const onSubmit = (data: PasswordChangeFormValues) => {
    const currentUserInAppContext = rawManagedUsers.find(
      mu => mu.username === authUser.username && mu.clientId === authUser.clientId
    );

    if (!currentUserInAppContext) {
      toast({ variant: "destructive", title: "Error", description: "Could not find your user account." });
      return;
    }

    if (currentUserInAppContext.password !== data.currentPassword) {
      form.setError("currentPassword", { type: "manual", message: "Incorrect current password." });
      toast({ variant: "destructive", title: "Validation Error", description: "Incorrect current password." });
      return;
    }

    try {
      updateManagedUser({ ...currentUserInAppContext, password: data.newPassword });
      toast({ title: "Password Changed", description: "Your password has been updated successfully." });
      form.reset();
      // Optionally, you might want to log the user out or redirect them.
      // For now, just reset the form.
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to change password." });
      console.error("Password change error:", error);
    }
  };

  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-headline flex items-center">
            <UserCog className="mr-3 h-8 w-8 text-primary"/>
            Account Settings
        </h1>
        <p className="text-muted-foreground">Manage your account details.</p>
      </div>

      <Card className="max-w-2xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center">
            <KeyRound className="mr-2 h-5 w-5 text-primary"/>
            Change Password
            </CardTitle>
          <CardDescription>Update your login password. Choose a strong, unique password.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmNewPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <Button type="submit" className="w-full mt-6" disabled={form.formState.isSubmitting}>
                Change Password
              </Button>
            </CardContent>
          </form>
        </Form>
      </Card>
    </div>
  );
}
