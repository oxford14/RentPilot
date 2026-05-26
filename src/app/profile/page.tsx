"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from '@/contexts/AuthContext';
import { useAppContext } from '@/contexts/AppContext';
import { User, UserCircle, ShieldCheck, Mail, KeyRound, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { serverChangeTenantPassword } from '@/actions/user-actions';
import { ClientUserProfile } from '@/components/profile/ClientUserProfile';

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: z.string().min(6, "New password must be at least 6 characters."),
  confirmNewPassword: z.string()
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: "New passwords don't match.",
  path: ["confirmNewPassword"],
});

type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>;

export default function ProfilePage() {
  const { user: authUser } = useAuth();
  const { clients, tenants, rawManagedUsers } = useAppContext();
  const { toast } = useToast();

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const form = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    }
  });

  const onPasswordSubmit = async (data: PasswordChangeFormValues) => {
    if (!authUser?.tenantId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not identify tenant.' });
        return;
    }
    const result = await serverChangeTenantPassword(authUser.tenantId, data.currentPassword, data.newPassword);
    if (result.success) {
      toast({ title: 'Success', description: 'Your password has been changed successfully.' });
      form.reset();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
      form.setError("currentPassword", { type: "manual", message: result.message });
    }
  };

  if (!authUser) {
    return (
      <div className="container mx-auto py-8 text-center">
        <p>Loading user profile...</p>
      </div>
    );
  }

  if (authUser.role === 'tenant') {
    const currentTenant = tenants.find(t => t.id === authUser.tenantId);
    
    return (
        <div className="container mx-auto py-2 space-y-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold font-headline flex items-center">
                <UserCircle className="mr-3 h-8 w-8 text-primary" />
                My Profile
                </h1>
                <p className="text-muted-foreground">View your information and manage your account settings.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-1 shadow-xl">
                    <CardHeader className="items-center text-center">
                        <Avatar className="h-24 w-24 mb-4 ring-2 ring-primary ring-offset-2">
                            <AvatarFallback>
                                <UserCircle className="h-20 w-20 text-muted-foreground" />
                            </AvatarFallback>
                        </Avatar>
                        <CardTitle className="text-2xl font-headline">{currentTenant?.name || authUser.username}</CardTitle>
                        <CardDescription>Tenant Account</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        <div className="flex items-center">
                            <User className="mr-3 h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">Username</p>
                                <p className="font-medium">{authUser.username}</p>
                            </div>
                        </div>
                        <div className="flex items-center">
                            <Mail className="mr-3 h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">Email</p>
                                <p className="font-medium break-all">{currentTenant?.email || 'Not available'}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2 shadow-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center"><KeyRound className="mr-2 h-5 w-5 text-primary"/> Change Your Password</CardTitle>
                        <CardDescription>Keep your account secure by using a strong, unique password.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onPasswordSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="currentPassword"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Current Password</FormLabel>
                                        <div className="relative">
                                        <FormControl>
                                            <Input type={showCurrentPassword ? "text" : "password"} {...field} />
                                        </FormControl>
                                        <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                                            {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                        </div>
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
                                         <div className="relative">
                                        <FormControl>
                                            <Input type={showNewPassword ? "text" : "password"} {...field} />
                                        </FormControl>
                                         <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowNewPassword(!showNewPassword)}>
                                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                        </div>
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
                                            <Input type="password" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>Update Password</Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
  }

  if (authUser.isSuperAdmin) {
    return (
      <div className="container mx-auto py-2 space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold font-headline flex items-center">
            <ShieldCheck className="mr-3 h-8 w-8 text-primary" />
            User Profile
          </h1>
          <p className="text-muted-foreground">Super administrator account.</p>
        </div>
        <Card className="max-w-lg shadow-xl">
          <CardHeader>
            <CardTitle>{authUser.username}</CardTitle>
            <CardDescription>Super Administrator</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Super admin accounts are managed from the admin panel.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const client = authUser.clientId ? clients.find(c => c.id === authUser.clientId) : null;
  const managedUser = rawManagedUsers.find(
    (mu) =>
      (authUser.id && mu.id === authUser.id) ||
      (mu.username === authUser.username && mu.clientId === authUser.clientId)
  ) ?? null;

  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-headline flex items-center">
          <UserCircle className="mr-3 h-8 w-8 text-primary" />
          User Profile
        </h1>
        <p className="text-muted-foreground">View and manage your profile information.</p>
      </div>
      <ClientUserProfile client={client ?? null} managedUser={managedUser} />
    </div>
  );
}
