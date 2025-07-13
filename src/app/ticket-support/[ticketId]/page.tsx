
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
  
  const isAuthorized = React.useMemo(() => {
    if (!client) return false;
    if (client.businessType !== 'ISP_Subscription') return false;
    if (user?.isSuperAdmin) return true; // Super admin can see any ticket IF viewing an ISP client
    if (ticket && user && ticket.clientId !== user.clientId) return false; // Non-super-admin can't see other clients' tickets
    return true;
  }, [client, ticket, user]);
  
  React.useEffect(() => {
    // This effect handles redirection if authorization status changes after initial render.
    if (client && !isAuthorized) {
      router.push('/');
    }
  }, [client, isAuthorized, router]);

  if (!isAuthorized) {
    return <div className="container mx-auto py-2"><p>Loading or unauthorized...</p></div>;
  }
  
  if (!ticket) {
    return <div className="container mx-auto py-2"><p>Loading ticket details or ticket not found...</p></div>;
  }
  
  return (
    <div className="container mx-auto py-2">
        <TicketDetails ticket={ticket} />
    </div>
  );
}
