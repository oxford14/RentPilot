
"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { format, isPast, differenceInDays } from 'date-fns';
import { Award, CheckCircle2, AlertTriangle, QrCode, Clock, DollarSign, CalendarDays, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Client } from '@/lib/types';
import { PaymongoSubscriptionDialog } from '@/components/payments/PaymongoSubscriptionDialog';

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
  const [isPaymongoOpen, setIsPaymongoOpen] = useState(false);

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
    <>
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
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-6 w-6 text-primary" />
                Pay Subscription
              </CardTitle>
              <CardDescription>
                Pay your subscription fee using QR Ph to extend your plan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Click the button below to generate a QR code for your subscription payment of <span className="font-bold">{rate}</span>.
                </p>
                <Button className="w-full" onClick={() => setIsPaymongoOpen(true)} disabled={rate === 'Free' || !client?.subscriptionRate}>
                  Pay {rate} with QR Ph
                </Button>
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
      <PaymongoSubscriptionDialog
        isOpen={isPaymongoOpen}
        onClose={() => setIsPaymongoOpen(false)}
        client={client}
        amount={client.subscriptionRate || 0}
      />
    </>
  );
}
