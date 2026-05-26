"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  User,
  Shield,
  ShieldCheck,
  Building,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  UserCircle,
  Save,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/contexts/AuthContext';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { serverChangeManagedUserPassword } from '@/actions/user-actions';
import { LogoCropUpload } from './LogoCropUpload';
import type { Client, ManagedUser } from '@/lib/types';

const accountSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters.'),
  email: z.string().email('Please enter a valid email address.'),
});

const companySchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters.'),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters.'),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "New passwords don't match.",
    path: ['confirmNewPassword'],
  });

type AccountValues = z.infer<typeof accountSchema>;
type CompanyValues = z.infer<typeof companySchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

type ClientUserProfileProps = {
  client: Client | null;
  managedUser: ManagedUser | null;
};

export function ClientUserProfile({ client, managedUser }: ClientUserProfileProps) {
  const { user: authUser, updateSessionUser } = useAuth();
  const { updateManagedUser, updateOwnClientProfile } = useAppContext();
  const { toast } = useToast();

  const [logoBlob, setLogoBlob] = useState<Blob | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);

  const isAdmin = authUser?.role === 'admin';

  const companyForm = useForm<CompanyValues>({
    resolver: zodResolver(companySchema),
    defaultValues: { name: client?.name || '' },
  });

  const accountForm = useForm<AccountValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      username: managedUser?.username || authUser?.username || '',
      email: managedUser?.email || authUser?.email || '',
    },
  });

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  useEffect(() => {
    companyForm.reset({ name: client?.name || '' });
    setLogoBlob(null);
  }, [client, companyForm]);

  useEffect(() => {
    accountForm.reset({
      username: managedUser?.username || authUser?.username || '',
      email: managedUser?.email || authUser?.email || '',
    });
  }, [managedUser, authUser, accountForm]);

  const getRoleInfo = () => {
    if (authUser?.role === 'admin') return { text: 'Client Administrator', Icon: Shield };
    if (authUser?.role === 'hub-admin') return { text: 'Hub Administrator', Icon: ShieldCheck };
    return { text: 'Client User', Icon: User };
  };

  const { text: roleText, Icon: RoleIcon } = getRoleInfo();

  const onSaveCompany = async (data: CompanyValues) => {
    if (!isAdmin) return;
    setSavingCompany(true);
    try {
      await updateOwnClientProfile({
        name: data.name,
        logoFile: logoBlob,
      });
      setLogoBlob(null);
    } catch {
      // toast handled in context
    } finally {
      setSavingCompany(false);
    }
  };

  const onSaveAccount = async (data: AccountValues) => {
    if (!managedUser) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not find your user account.' });
      return;
    }
    setSavingAccount(true);
    try {
      await updateManagedUser({
        ...managedUser,
        username: data.username,
        email: data.email,
      });
      updateSessionUser({ username: data.username, email: data.email });
      toast({ title: 'Profile Updated', description: 'Your account details have been saved.' });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update profile.' });
    } finally {
      setSavingAccount(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordValues) => {
    if (!managedUser?.id) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not find your user account.' });
      return;
    }
    const result = await serverChangeManagedUserPassword(
      managedUser.id,
      data.currentPassword,
      data.newPassword
    );
    if (result.success) {
      toast({ title: 'Password Changed', description: 'Your password has been updated.' });
      passwordForm.reset();
    } else {
      passwordForm.setError('currentPassword', { type: 'manual', message: result.message });
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1 shadow-xl">
        <CardHeader className="items-center text-center border-b pb-6">
          {client?.logoUrl ? (
            <div className="relative h-20 w-36 mb-4">
              <Image
                src={client.logoUrl}
                alt={`${client.name} logo`}
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          ) : (
            <div className="h-20 w-20 mb-4 rounded-full bg-muted flex items-center justify-center ring-2 ring-primary ring-offset-2">
              <UserCircle className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
          <CardTitle className="text-2xl font-headline">{authUser?.username}</CardTitle>
          <CardDescription className="flex items-center justify-center gap-1">
            <RoleIcon className="h-4 w-4 text-muted-foreground" />
            {roleText}
          </CardDescription>
          {client && (
            <CardDescription className="flex items-center justify-center gap-1 mt-1">
              <Building className="h-4 w-4 text-muted-foreground" />
              {client.name}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center">
            <Mail className="mr-3 h-5 w-5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium break-all">
                {managedUser?.email || authUser?.email || 'Not set'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="lg:col-span-2 space-y-6">
        {isAdmin && client && (
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5 text-primary" />
                Company Profile
              </CardTitle>
              <CardDescription>Update your company name and logo shown in the app header.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...companyForm}>
                <form onSubmit={companyForm.handleSubmit(onSaveCompany)} className="space-y-6">
                  <LogoCropUpload
                    currentLogoUrl={client.logoUrl}
                    companyName={client.name}
                    onLogoReady={setLogoBlob}
                  />
                  <FormField
                    control={companyForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your company name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={savingCompany}>
                    <Save className="mr-2 h-4 w-4" />
                    {savingCompany ? 'Saving...' : 'Save Company Profile'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              My Account
            </CardTitle>
            <CardDescription>Update your login username and contact email.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...accountForm}>
              <form onSubmit={accountForm.handleSubmit(onSaveAccount)} className="space-y-4">
                <FormField
                  control={accountForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input {...field} autoComplete="username" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={accountForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} autoComplete="email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={savingAccount}>
                  <Save className="mr-2 h-4 w-4" />
                  {savingAccount ? 'Saving...' : 'Save Account'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Change Password
            </CardTitle>
            <CardDescription>Keep your account secure with a strong, unique password.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input
                            type={showCurrentPassword ? 'text' : 'password'}
                            {...field}
                            autoComplete="current-password"
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        >
                          {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input
                            type={showNewPassword ? 'text' : 'password'}
                            {...field}
                            autoComplete="new-password"
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="confirmNewPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} autoComplete="new-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={passwordForm.formState.isSubmitting}>
                  Update Password
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
