
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from '@/contexts/AuthContext';
import { useAppContext } from '@/contexts/AppContext';
import { useRouter } from 'next/navigation';
import { Ticket } from 'lucide-react';
import { TechSupportTicketList } from '@/components/isp-support/TechSupportTicketList';

export default function TicketSupportPage() {
  const { user } = useAuth();
  const { clients, viewingAsClientId } = useAppContext();
  const router = useRouter();

  const client = React.useMemo(() => {
    const currentContextClientId = user?.isSuperAdmin ? viewingAsClientId : user?.clientId;
    if (!currentContextClientId) return null;
    return clients.find(c => c.id === currentContextClientId);
  }, [user, clients, viewingAsClientId]);

  React.useEffect(() => {
    if (user?.isSuperAdmin) return; // Super admin always has access

    if (client && client.businessType !== 'ISP_Subscription') {
        router.push('/');
    }
  }, [client, router, user]);

  if (!user?.isSuperAdmin && (!client || client.businessType !== 'ISP_Subscription')) {
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
          Technical Support Tickets
        </h1>
        <p className="text-muted-foreground">
          View and manage support requests from your subscribers.
        </p>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Ticket Queue</CardTitle>
          <CardDescription>
            All support tickets submitted by your subscribers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TechSupportTicketList />
        </CardContent>
      </Card>
    </div>
  );
}
