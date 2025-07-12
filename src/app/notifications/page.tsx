
"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Bell, Save, Loader2, Info, Mail, Smartphone } from 'lucide-react';
import { useRouter } from 'next/navigation';

const notificationSettingsSchema = z.object({
  daysBeforeDueDate: z.coerce.number().min(0).max(30),
  notifyOnDueDate: z.boolean(),
  daysBeforeContractExpiry: z.coerce.number().min(0).max(90),
});

type FormValues = z.infer<typeof notificationSettingsSchema>;

export default function NotificationSettingsPage() {
  const { clients, updateClientNotificationSettings } = useAppContext();
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const client = useMemo(() => {
    if (!user || !user.clientId) return null;
    return clients.find(c => c.id === user.clientId);
  }, [user, clients]);

  const form = useForm<FormValues>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      daysBeforeDueDate: 3,
      notifyOnDueDate: true,
      daysBeforeContractExpiry: 14,
    },
  });

  useEffect(() => {
    if (user && client) {
      const isClientAdmin = user.role === 'admin';
      const isHubAdminForIVirtuaTech = user.role === 'hub-admin' && client.name === 'i-VirtuaTech';

      if (!user.isSuperAdmin && !isClientAdmin && !isHubAdminForIVirtuaTech) {
        toast({ variant: 'destructive', title: 'Access Denied', description: 'You do not have permission to view this page.' });
        router.push('/');
      }
    } else if (user && !user.isSuperAdmin && user.role === 'tenant') {
        // Handle tenant case where client might not be loaded yet but we know they're a tenant
        toast({ variant: 'destructive', title: 'Access Denied', description: 'This page is for administrators.' });
        router.push('/');
    }
  }, [user, client, router, toast]);

  useEffect(() => {
    if (client?.notificationSettings) {
      form.reset(client.notificationSettings);
    }
  }, [client, form]);

  const onSubmit = async (data: FormValues) => {
    if (!client) {
      toast({ variant: 'destructive', title: 'Error', description: 'Client context not found.' });
      return;
    }
    try {
        await updateClientNotificationSettings(data);
        toast({ title: 'Settings Saved', description: 'Your notification preferences have been updated.' });
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error Saving Settings", description: error.message });
    }
  };

  if (!client && !user?.isSuperAdmin) {
      return (
          <div className="container mx-auto py-2 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">Loading client settings...</p>
          </div>
      );
  }

  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-headline flex items-center">
          <Bell className="mr-3 h-8 w-8 text-primary" />
          Notification Settings
        </h1>
        <p className="text-muted-foreground">Configure automated reminders for your tenants.</p>
      </div>
      
       <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>How It Works</AlertTitle>
          <AlertDescription>
            These settings control when automatic reminders are sent. This process runs daily in the background. Notifications are delivered to both the tenant's in-app inbox and their registered email address.
          </AlertDescription>
      </Alert>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Rent Due Reminders</CardTitle>
              <CardDescription>Set up reminders for upcoming and current rent payments.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="daysBeforeDueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pre-Due Date Reminder</FormLabel>
                    <div className="flex items-center gap-2">
                        <span className="text-sm">Send</span>
                        <Input type="number" {...field} className="w-20" />
                        <span className="text-sm">days before the due date.</span>
                    </div>
                    <FormDescription>Set to 0 to disable. Sends an in-app and email reminder.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notifyOnDueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Due Day Reminder</FormLabel>
                      <FormDescription>
                        Send a reminder on the exact due date if a balance is outstanding.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Contract Expiration Reminders</CardTitle>
              <CardDescription>Notify tenants whose contracts are nearing their end date.</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="daysBeforeContractExpiry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contract Expiry Reminder</FormLabel>
                     <div className="flex items-center gap-2">
                        <span className="text-sm">Send</span>
                        <Input type="number" {...field} className="w-20" />
                        <span className="text-sm">days before the contract ends.</span>
                    </div>
                    <FormDescription>Set to 0 to disable. Sends an in-app and email reminder.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
             <CardFooter className="border-t px-6 py-4">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Settings
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}

