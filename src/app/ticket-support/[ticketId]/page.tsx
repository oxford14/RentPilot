
"use client";

import React, { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAppContext } from '@/contexts/AppContext';
import { useRouter } from 'next/navigation';
import { TicketDetails } from '@/components/isp-support/TicketDetails';

export default function TicketDetailsPage({ params }: { params: { ticketId: string } }) {
  const { user } = useAuth();
  const { clients, techSupportRequests, viewingAsClientId } = useAppContext();
  const router = useRouter();
  const ticketId = params.ticketId;

  const ticket = useMemo(() => {
    return techSupportRequests.find(t => t.id === ticketId);
  }, [techSupportRequests, ticketId]);

  const client = useMemo(() => {
    const currentContextClientId = user?.isSuperAdmin ? viewingAsClientId : user?.clientId;
    if (!currentContextClientId) return null;
    return clients.find(c => c.id === currentContextClientId);
  }, [user, clients, viewingAsClientId]);
  
  React.useEffect(() => {
    if (user?.isSuperAdmin) return; // Super admin always has access

    // Redirect if the client isn't an ISP, or if the ticket doesn't belong to them
    if (client && client.businessType !== 'ISP_Subscription') {
        router.push('/');
    }
    if (ticket && user && ticket.clientId !== user.clientId) {
        router.push('/ticket-support');
    }
  }, [client, router, ticket, user]);

  if (!ticket) {
    return <div className="container mx-auto py-2"><p>Loading ticket details or ticket not found...</p></div>;
  }
  
  return (
    <div className="container mx-auto py-2">
        <TicketDetails ticket={ticket} />
    </div>
  );
}
