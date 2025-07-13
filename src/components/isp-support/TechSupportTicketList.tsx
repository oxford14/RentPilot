"use client";

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Ticket } from 'lucide-react';
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

export function TechSupportTicketList() {
    const { techSupportRequests } = useAppContext();
    const router = useRouter();

    const sortedTickets = useMemo(() => {
        return [...techSupportRequests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [techSupportRequests]);

    const handleViewTicket = (ticketId: string) => {
        router.push(`/ticket-support/${ticketId}`);
    };

    if (sortedTickets.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-12">
                <Ticket className="mx-auto h-12 w-12 mb-4 text-gray-400" />
                <p className="text-lg font-medium">No Support Tickets</p>
                <p className="text-sm">There are no support tickets to display.</p>
            </div>
        );
    }
    
    return (
        <div className="rounded-lg border shadow-sm overflow-hidden bg-card">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Subscriber</TableHead>
                        <TableHead>Issue Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedTickets.map(ticket => (
                        <TableRow key={ticket.id} className="hover:bg-muted/50 transition-colors">
                            <TableCell className="font-medium">{ticket.subscriberName}</TableCell>
                            <TableCell>
                                <Badge variant="outline">{ticket.issueType}</Badge>
                            </TableCell>
                            <TableCell>
                                <Badge variant="default" className={cn("text-xs", statusColors[ticket.status])}>
                                    {ticket.status}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                            </TableCell>
                            <TableCell>{ticket.assignedTechnicianName || 'Unassigned'}</TableCell>
                            <TableCell className="text-right">
                                <Button variant="outline" size="sm" onClick={() => handleViewTicket(ticket.id)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
