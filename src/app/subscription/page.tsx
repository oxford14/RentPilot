"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { format, isPast, differenceInDays } from 'date-fns';
import { Award, CheckCircle2, AlertTriangle, ScanLine, Clock, DollarSign, CalendarDays, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Client } from '@/lib/types';

// GCash logo as an inline SVG component
const GcashLogo = () => (
  <svg width="80" height="24" viewBox="0 0 100 34" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
    <path d="M42.5 13.9C42.5 11.2 44.7 9 47.4 9C50.1 9 52.3 11.2 52.3 13.9C52.3 16.6 50.1 18.8 47.4 18.8C44.7 18.8 42.5 16.6 42.5 13.9ZM50.3 13.9C50.3 12.3 49 11 47.4 11C45.8 11 44.5 12.3 44.5 13.9C44.5 15.5 45.8 16.8 47.4 16.8C49 16.8 50.3 15.5 50.3 13.9Z" fill="#0066FF"/>
    <path d="M57.6 9.2C56.8 9.2 56.1 9.7 55.9 10.4L53.5 17.5H55.6L56.1 16.1H59.1L59.6 17.5H61.7L59.3 9.7C59.1 9.3 58.7 9.1 58.3 9.1L57.6 9.2ZM57.6 11.1L58.5 14.1H60.2L58.5 14.1L57.6 11.1Z" fill="#0066FF"/>
    <path d="M64.3 9H62.3V18.8H64.3V9Z" fill="#0066FF"/>
    <path d="M72.4 9.2C71.6 9.2 70.9 9.7 70.7 10.4L68.3 17.5H70.4L70.9 16.1H73.9L74.4 17.5H76.5L74.1 9.7C73.9 9.3 73.5 9.1 73.1 9.1L72.4 9.2ZM72.4 11.1L73.3 14.1H75L73.3 14.1L72.4 11.1Z" fill="#0066FF"/>
    <path d="M86.8 9.2C85.7 9.2 84.8 10.1 84.8 11.2V16.6C84.8 17.7 85.7 18.6 86.8 18.6C87.9 18.6 88.8 17.7 88.8 16.6V11.2C88.8 10.1 87.9 9.2 86.8 9.2ZM86.8 16.9C86.6 16.9 86.5 16.8 86.5 16.6V11.2C86.5 11.1 86.6 10.9 86.8 10.9C87 10.9 87.1 11.1 87.1 11.2V16.6C87.1 16.8 87 16.9 86.8 16.9Z" fill="#0066FF"/>
    <path d="M96.7 9H90V18.8H91.9V14.9H95.4L96.7 18.8H98.8L97.2 14.4C97.9 13.9 98.3 13.1 98.3 12.2C98.3 10.4 97.6 9 96.7 9ZM95.4 13.1H91.9V10.7H95.4C96.1 10.7 96.6 11.4 96.6 12.1C96.6 12.8 96.1 13.1 95.4 13.1Z" fill="#0066FF"/>
    <path d="M25.7 0H8.5C3.8 0 0 3.8 0 8.5V25.7C0 30.4 3.8 34.2 8.5 34.2H25.7C30.4 34.2 34.2 30.4 34.2 25.7V8.5C34.2 3.8 30.4 0 25.7 0ZM19.6 24.3C18.1 25.8 16 26.6 13.8 26.6C9.9 26.6 6.8 23.5 6.8 19.6C6.8 15.7 9.9 12.6 13.8 12.6C16 12.6 18.1 13.4 19.6 14.9L18 16.5C16.9 15.4 15.5 14.7 13.8 14.7C11.1 14.7 8.9 16.9 8.9 19.6C8.9 22.3 11.1 24.5 13.8 24.5C15.5 24.5 16.9 23.8 18 22.7L19.6 24.3ZM27.4 19.6C27.4 22.3 25.2 24.5 22.5 24.5C20.9 24.5 19.5 23.8 18.4 22.7L19.9 21.1C20.8 21.9 21.6 22.4 22.5 22.4C24.1 22.4 25.3 21.2 25.3 19.6C25.3 18 24.1 16.8 22.5 16.8C21.6 16.8 20.8 17.3 19.9 18.1L18.4 16.5C19.5 15.4 20.9 14.7 22.5 14.7C25.2 14.7 27.4 16.9 27.4 19.6Z" fill="#0066FF"/>
  </svg>
);

function PlanCard({ title, price, description, features, isFeatured = false }: { title: string, price: string, description: string, features: string[], isFeatured?: boolean }) {
    return (
        <Card className={cn(isFeatured && 'border-primary ring-2 ring-primary shadow-lg')}>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription className="text-2xl font-bold">{price}</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="mb-4">{description}</p>
                <ul className="space-y-2">
                    {features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500" />
                            <span>{feature}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}

export default function SubscriptionPage() {
  const { user, isLoading: authIsLoading } = useAuth();
  const { clients } = useAppContext();
  const router = useRouter();

  const client = React.useMemo(() => {
    if (!user || !user.clientId) return null;
    return clients.find(c => c.id === user.clientId);
  }, [user, clients]);

  React.useEffect(() => {
    if (!authIsLoading && (!user || user.isSuperAdmin || user.role === 'tenant')) {
      router.push('/');
    }
  }, [user, authIsLoading, router]);

  const { status, statusInfo, formattedEndDate, planName, rate } = useMemo(() => {
    if (!client) {
      return { status: 'Inactive', statusInfo: null, formattedEndDate: 'N/A', planName: 'N/A', rate: 'N/A' };
    }

    let status: 'Active' | 'Expired' | 'Expiring Soon' | 'Inactive' = 'Inactive';
    if (client.subscriptionStatus === 'active' && client.subscriptionEndDate) {
      const endDate = new Date(client.subscriptionEndDate);
      if (isPast(endDate)) {
        status = 'Expired';
      } else if (differenceInDays(endDate, new Date()) <= 7) {
        status = 'Expiring Soon';
      } else {
        status = 'Active';
      }
    } else if (client.subscriptionStatus === 'active') {
      status = 'Active';
    }
    
    const infoMap = {
      'Active': { variant: 'default', icon: CheckCircle2, color: 'bg-green-500/20 text-green-700 border-green-400' },
      'Expiring Soon': { variant: 'destructive', icon: Clock, color: 'bg-yellow-500/20 text-yellow-700 border-yellow-400' },
      'Expired': { variant: 'destructive', icon: AlertTriangle, color: 'bg-red-500/20 text-red-700 border-red-400' },
      'Inactive': { variant: 'secondary', icon: AlertTriangle, color: '' },
    };

    const isTrial = (client.subscriptionPlanName || '').toLowerCase() === 'trial';

    return {
      status,
      statusInfo: infoMap[status],
      formattedEndDate: client.subscriptionEndDate ? format(new Date(client.subscriptionEndDate), 'MMMM dd, yyyy') : 'N/A',
      planName: client.subscriptionPlanName || 'Standard Plan',
      rate: isTrial
        ? 'Free'
        : (client.subscriptionRate !== undefined ? `₱${client.subscriptionRate.toLocaleString()}/month` : 'N/A'),
    };
  }, [client]);

  if (authIsLoading || !client) {
    return (
      <div className="container mx-auto py-2">
        <p>Loading subscription details...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-2 space-y-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-headline flex items-center">
          <Award className="mr-3 h-8 w-8 text-primary" />
          Subscription & Billing
        </h1>
        <p className="text-muted-foreground">
          Manage your subscription plan and payment methods.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>{planName}</CardTitle>
            <CardDescription>Your current subscription status with RentPilot.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <span className="font-semibold flex items-center gap-2"><DollarSign className="h-4 w-4" /> Rate</span>
              <span className="font-medium">{rate}</span>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <span className="font-semibold flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Valid Until</span>
              <span className="font-medium">{formattedEndDate}</span>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <span className="font-semibold flex items-center gap-2"><Clock className="h-4 w-4" /> Status</span>
              {statusInfo && (
                <Badge variant={statusInfo.variant} className={cn('text-sm', statusInfo.color)}>
                  <statusInfo.icon className="h-4 w-4 mr-1"/>
                  {status}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground pt-4">
              For any questions about your subscription or to make changes to your plan, please contact our support team.
            </p>
          </CardContent>
          <CardFooter>
             <Button variant="outline">Contact Support</Button>
          </CardFooter>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
                <GcashLogo />
                Pay with GCash
            </CardTitle>
            <CardDescription>
              Scan the QR code below to make a payment using GCash.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center flex flex-col items-center">
            <div className="p-2 border-4 border-blue-500 rounded-xl bg-white inline-block">
                <Image
                src="https://firebasestorage.googleapis.com/v0/b/tenanttracker-u4wuw.firebasestorage.app/o/Mayang%20Gcash.jpeg?alt=media"
                alt="GCash QR Code"
                width={256}
                height={256}
                data-ai-hint="gcash qr"
                />
            </div>
            <div className="mt-4 text-left p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-semibold mb-2 flex items-center"><ScanLine className="h-4 w-4 mr-2"/>Instructions:</p>
                <ol className="list-decimal list-inside text-xs space-y-1 text-muted-foreground">
                    <li>Open your GCash app and tap 'Scan QR'.</li>
                    <li>Align your camera with the QR code above.</li>
                    <li>Enter the payment amount and confirm.</li>
                    <li>Save a screenshot of your receipt.</li>
                    <li>Email the receipt to our support team to confirm your payment.</li>
                </ol>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-2xl font-bold font-headline mb-4 mt-8">Available Plans</h2>
        <div className="grid md:grid-cols-3 gap-6">
            <PlanCard 
                title="Trial"
                price="Free"
                description="Get started with all the essential features for 1 month."
                features={["Manage up to 3 tenants", "Payment Tracking", "Basic Reporting", "Email Support"]}
                isFeatured={(client?.subscriptionPlanName || '').toLowerCase() === 'trial'}
            />
            <PlanCard 
                title="Basic Plan"
                price="₱200 / month"
                description="Ideal for growing businesses, supporting up to 50 tenants."
                features={["Up to 50 tenants", "Advanced Reporting", "AI Delinquency Prediction", "Priority Support"]}
                isFeatured={(client?.subscriptionPlanName || '').toLowerCase() === 'basic'}
            />
            <PlanCard 
                title="Pro Plan"
                price="₱500 / month"
                description="For large-scale operations with unlimited tenants."
                features={["Unlimited tenants", "Advanced Reporting", "AI Delinquency Prediction", "Data Backup & Restore", "Phone & Chat Support"]}
                isFeatured={(client?.subscriptionPlanName || '').toLowerCase() === 'pro'}
            />
        </div>
      </div>
    </div>
  );
}
