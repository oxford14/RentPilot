
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from '@/contexts/AuthContext';
import { useAppContext } from '@/contexts/AppContext';
import { useRouter } from 'next/navigation';
import { Ticket, ListFilter } from 'lucide-react';
import { TechSupportTicketList } from '@/components/isp-support/TechSupportTicketList';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ticketStatuses, type TicketStatus } from '@/lib/types';


export default function TicketSupportPage() {
  const { user } = useAuth();
  const { clients, viewingAsClientId } = useAppContext();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = React.useState<TicketStatus | 'all'>('all');

  const client = React.useMemo(() => {
    const currentContextClientId = user?.isSuperAdmin ? viewingAsClientId : user?.clientId;
    if (!currentContextClientId) return null;
    return clients.find(c => c.id === currentContextClientId);
  }, [user, clients, viewingAsClientId]);

  const isAuthorized = React.useMemo(() => {
    if (!client) return false;
    // Super admin can see this page ONLY when viewing as an ISP client
    if (user?.isSuperAdmin) {
      return client.businessType === 'ISP_Subscription';
    }
    // Regular clients/users must have the correct business type
    return client.businessType === 'ISP_Subscription';
  }, [client, user]);

  React.useEffect(() => {
    if (client && !isAuthorized) {
        router.push('/');
    }
  }, [client, isAuthorized, router]);

  if (!isAuthorized) {
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
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>Ticket Queue</CardTitle>
                <CardDescription>
                  All support tickets submitted by your subscribers.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <ListFilter className="h-4 w-4 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Filter by status..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {ticketStatuses.map(status => (
                            <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>
            </div>
        </CardHeader>
        <CardContent>
          <TechSupportTicketList statusFilter={statusFilter} />
        </CardContent>
      </Card>
    </div>
  );
}
