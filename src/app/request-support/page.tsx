
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RequestSupportForm } from '@/components/isp-support/RequestSupportForm';
import { useAuth } from '@/contexts/AuthContext';
import { useAppContext } from '@/contexts/AppContext';
import { useRouter } from 'next/navigation';
import { Ticket, TicketCheck, TicketX } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { TicketStatus } from '@/lib/types';


const statusColors: Record<TicketStatus, string> = {
    'Pending': 'bg-yellow-500/20 text-yellow-700 border-yellow-400',
    'Assigned': 'bg-blue-500/20 text-blue-700 border-blue-400',
    'In Progress': 'bg-indigo-500/20 text-indigo-700 border-indigo-400',
    'Resolved': 'bg-green-500/20 text-green-700 border-green-400',
    'Closed': 'bg-gray-500/20 text-gray-700 border-gray-400',
};


export default function RequestSupportPage() {
  const { user } = useAuth();
  const { clients, techSupportRequests } = useAppContext();
  const router = useRouter();

  const client = React.useMemo(() => {
    if (!user?.clientId) return null;
    return clients.find(c => c.id === user.clientId);
  }, [user, clients]);

  const { openTickets, closedTickets } = React.useMemo(() => {
    if (!techSupportRequests) return { openTickets: [], closedTickets: [] };

    const sorted = [...techSupportRequests].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const open = sorted.filter(t => t.status === 'Pending' || t.status === 'Assigned' || t.status === 'In Progress');
    const closed = sorted.filter(t => t.status === 'Resolved' || t.status === 'Closed');
    
    return { openTickets: open, closedTickets: closed };
  }, [techSupportRequests]);

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
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
          <div className="md:col-span-2">
            <Card className="shadow-xl">
                <CardHeader>
                    <CardTitle>My Support Tickets</CardTitle>
                    <CardDescription>View the status of your submitted support requests.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="open">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="open">
                                <TicketCheck className="mr-2 h-4 w-4"/>
                                Open Tickets ({openTickets.length})
                            </TabsTrigger>
                            <TabsTrigger value="closed">
                                <TicketX className="mr-2 h-4 w-4"/>
                                Closed Tickets ({closedTickets.length})
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="open" className="mt-4">
                            {openTickets.length > 0 ? (
                                <ul className="space-y-3">
                                    {openTickets.map(ticket => (
                                        <li key={ticket.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => router.push(`/ticket-support/${ticket.id}`)}>
                                            <div className="flex justify-between items-start">
                                                <p className="font-semibold">{ticket.issueType}</p>
                                                <Badge className={cn("text-xs", statusColors[ticket.status])}>{ticket.status}</Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground truncate mt-1">{ticket.description}</p>
                                            <p className="text-xs text-muted-foreground mt-2">{formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}</p>
                                        </li>
                                    ))}
                                </ul>
                            ) : (<p className="text-center text-muted-foreground py-8">No open tickets.</p>)}
                        </TabsContent>
                         <TabsContent value="closed" className="mt-4">
                            {closedTickets.length > 0 ? (
                                 <ul className="space-y-3">
                                    {closedTickets.map(ticket => (
                                        <li key={ticket.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => router.push(`/ticket-support/${ticket.id}`)}>
                                            <div className="flex justify-between items-start">
                                                <p className="font-semibold">{ticket.issueType}</p>
                                                <Badge className={cn("text-xs", statusColors[ticket.status])}>{ticket.status}</Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground truncate mt-1">{ticket.description}</p>
                                            <p className="text-xs text-muted-foreground mt-2">{formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}</p>
                                        </li>
                                    ))}
                                </ul>
                            ) : (<p className="text-center text-muted-foreground py-8">No closed tickets.</p>)}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
          </div>
      </div>
    </div>
  );
}
