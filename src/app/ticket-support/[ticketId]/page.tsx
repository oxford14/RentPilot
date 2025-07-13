
"use client";

import React, { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAppContext } from '@/contexts/AppContext';
import { useRouter, useParams } from 'next/navigation';
import { TicketDetails } from '@/components/isp-support/TicketDetails';

export default function TicketDetailsPage() {
  const { user } = useAuth();
  const { clients, techSupportRequests, viewingAsClientId } = useAppContext();
  const router = useRouter();
  const params = useParams();
  const ticketId = params.ticketId as string;

  const ticket = useMemo(() => {
    if (!techSupportRequests || !Array.isArray(techSupportRequests)) return null;
    return techSupportRequests.find(t => t.id === ticketId);
  }, [techSupportRequests, ticketId]);

  const client = useMemo(() => {
    const currentContextClientId = user?.isSuperAdmin ? viewingAsClientId : user?.clientId;
    if (!currentContextClientId) return null;
    return clients.find(c => c.id === currentContextClientId);
  }, [user, clients, viewingAsClientId]);
  
  const isAuthorized = React.useMemo(() => {
    if (!client) return false;
    // Allow super admin to see any ticket, but only if they are viewing as an ISP client
    if (user?.isSuperAdmin) {
        return client.businessType === 'ISP_Subscription';
    }
    
    // For non-super admins, enforce business type and ticket ownership
    if (client.businessType !== 'ISP_Subscription') return false;
    if (ticket && user && ticket.clientId !== user.clientId) return false;
    
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
