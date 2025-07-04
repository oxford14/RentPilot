
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { useAppContext } from '@/contexts/AppContext';
import { MoreHorizontal, Check, X, Clock, Handshake, ThumbsUp, ThumbsDown } from 'lucide-react';
import type { RentAdjustmentRequest } from '@/lib/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const getStatusBadgeVariant = (status: RentAdjustmentRequest['status']) => {
  switch (status) {
    case 'approved': return 'bg-green-500/20 text-green-700 border-green-400';
    case 'denied': return 'bg-red-500/20 text-red-700 border-red-400';
    case 'pending':
    default:
      return 'bg-yellow-500/20 text-yellow-700 border-yellow-400';
  }
};

const getStatusIcon = (status: RentAdjustmentRequest['status']) => {
    switch(status) {
        case 'approved': return <Check className="h-3 w-3 mr-1" />;
        case 'denied': return <X className="h-3 w-3 mr-1" />;
        case 'pending':
        default: return <Clock className="h-3 w-3 mr-1" />;
    }
}

function DenyRequestDialog({ request, onConfirm }: { request: RentAdjustmentRequest; onConfirm: (requestId: string, notes: string) => void }) {
  const [notes, setNotes] = useState('');

  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Deny Rent Adjustment Request</AlertDialogTitle>
        <AlertDialogDescription>
          You are about to deny the request from {request.tenantName}. Please provide a reason for the denial. This note will be visible to the tenant.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div className="py-4">
        <Label htmlFor="deny-notes">Reason for Denial (Optional)</Label>
        <Input id="deny-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g., Market rates have increased." />
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction onClick={() => onConfirm(request.id, notes)} className={cn(buttonVariants({ variant: "destructive" }))}>Confirm Denial</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}


export default function RentRequestsPage() {
  const { rentAdjustmentRequests, approveRentAdjustmentRequest, denyRentAdjustmentRequest } = useAppContext();
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'denied'>('all');
  const [requestToDeny, setRequestToDeny] = useState<RentAdjustmentRequest | null>(null);

  const sortedRequests = useMemo(() => {
    return [...rentAdjustmentRequests].sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  }, [rentAdjustmentRequests]);

  const filteredRequests = useMemo(() => {
    if (filter === 'all') {
      return sortedRequests;
    }
    return sortedRequests.filter(req => req.status === filter);
  }, [sortedRequests, filter]);
  
  return (
    <div className="container mx-auto py-2 space-y-6">
       <div className="mb-6">
        <h1 className="text-3xl font-bold font-headline flex items-center">
          <Handshake className="mr-3 h-8 w-8 text-primary" />
          Rent Adjustment Requests
        </h1>
        <p className="text-muted-foreground">
          Review and process rent adjustment requests from tenants.
        </p>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Incoming Requests</CardTitle>
          <CardDescription>A log of all submitted rent change requests.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border shadow-sm overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Current Rate</TableHead>
                  <TableHead>Proposed Rate</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Effective Date</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length > 0 ? (
                  filteredRequests.map(req => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">{req.tenantName}</TableCell>
                      <TableCell>₱{req.currentRate.toLocaleString()}</TableCell>
                      <TableCell>₱{req.proposedRate.toLocaleString()}</TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate">{req.reason}</TableCell>
                       <TableCell>{format(new Date(req.effectiveDate), 'PP')}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={cn("text-xs", getStatusBadgeVariant(req.status))}>
                           {getStatusIcon(req.status)}
                           {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {req.status === 'pending' && (
                           <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => approveRentAdjustmentRequest(req.id)}>
                                <ThumbsUp className="h-4 w-4"/>
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700">
                                        <ThumbsDown className="h-4 w-4"/>
                                    </Button>
                                </AlertDialogTrigger>
                                <DenyRequestDialog request={req} onConfirm={denyRentAdjustmentRequest} />
                            </AlertDialog>
                           </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No rent adjustment requests found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
