"use client";

import React from 'react';
import type { TechSupportRequest } from '@/lib/types';

interface TicketDetailsProps {
    ticket: TechSupportRequest;
}

export function TicketDetails({ ticket }: TicketDetailsProps) {
    return (
        <div>
            <h1>Details for Ticket #{ticket.id.substring(0, 6).toUpperCase()}</h1>
            <p>This page is under construction.</p>
            <pre>{JSON.stringify(ticket, null, 2)}</pre>
        </div>
    )
}
