"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RequestSupportForm } from '@/components/isp-support/RequestSupportForm';
import { useAuth } from '@/contexts/AuthContext';
import { useAppContext } from '@/contexts/AppContext';
import { useRouter } from 'next/navigation';
import { Ticket } from 'lucide-react';

export default function RequestSupportPage() {
  const { user } = useAuth();
  const { clients } = useAppContext();
  const router = useRouter();

  const client = React.useMemo(() => {
    if (!user?.clientId) return null;
    return clients.find(c => c.id === user.clientId);
  }, [user, clients]);

  React.useEffect(() => {
    if (client && client.businessType !== 'ISP_Subscription') {
        router.push('/');
    }
  }, [client, router]);

  if (!client || client.businessType !== 'ISP_Subscription') {
    return (
        <div className="container mx-auto py-2">
            <p>Loading or unauthorized...</p>
        </div>
    );
  }

  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-headline flex items-center">
          <Ticket className="mr-3 h-8 w-8 text-primary" />
          Request Technical Support
        </h1>
        <p className="text-muted-foreground">
          Experiencing issues? Let us know by filling out the form below.
        </p>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>New Support Ticket</CardTitle>
          <CardDescription>
            Please describe your issue in detail. Our team will get back to you as soon as possible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RequestSupportForm />
        </CardContent>
      </Card>
    </div>
  );
}
