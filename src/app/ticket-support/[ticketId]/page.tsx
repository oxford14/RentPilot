// src/app/ticket-support/[ticketId]/page.tsx
"use client";

import React from 'react';

export default function TicketDetailsPage({ params }: { params: { ticketId: string } }) {
  return (
    <div>
      <h1>Ticket Details for #{params.ticketId}</h1>
      <p>This page is under construction.</p>
    </div>
  );
}
