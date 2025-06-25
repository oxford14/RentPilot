
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAppContext } from '@/contexts/AppContext';
import { MoreHorizontal, CalendarCheck, Check, Clock, Trash2, ShieldCheck, ListFilter } from 'lucide-react';
import type { DemoRequest } from '@/lib/types';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


const getStatusBadgeVariant = (status: DemoRequest['status']) => {
  switch (status) {
    case 'confirmed': return 'bg-blue-500/20 text-blue-700 border-blue-400';
    case 'completed': return 'bg-green-500/20 text-green-700 border-green-400';
    case 'pending':
    default:
      return 'bg-yellow-500/20 text-yellow-700 border-yellow-400';
  }
};

const getStatusIcon = (status: DemoRequest['status']) => {
    switch(status) {
        case 'confirmed': return <ShieldCheck className="h-3 w-3 mr-1" />;
        case 'completed': return <Check className="h-3 w-3 mr-1" />;
        case 'pending':
        default: return <Clock className="h-3 w-3 mr-1" />;
    }
}

export default function DemoRequestsPage() {
  const { rawDemoRequests, updateDemoRequestStatus, deleteDemoRequest } = useAppContext();
  const { toast } = useToast();
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed'>('all');
  const [requestToDelete, setRequestToDelete] = useState<DemoRequest | null>(null);

  const sortedRequests = useMemo(() => {
    return [...rawDemoRequests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [rawDemoRequests]);

  const filteredRequests = useMemo(() => {
    if (filter === 'all') {
      return sortedRequests;
    }
    return sortedRequests.filter(req => req.status === filter);
  }, [sortedRequests, filter]);

  const handleUpdateStatus = (id: string, status: DemoRequest['status']) => {
    updateDemoRequestStatus(id, status);
  };
  
  const confirmDelete = (request: DemoRequest) => {
    setRequestToDelete(request);
  };

  const handleDelete = () => {
    if (requestToDelete) {
      deleteDemoRequest(requestToDelete.id);
      toast({title: "Request Deleted", description: "The demo request has been deleted."});
      setRequestToDelete(null);
    }
  };


  return (
    <div className="container mx-auto py-2 space-y-6">
       <div className="mb-6">
        <h1 className="text-3xl font-bold font-headline flex items-center">
          <CalendarCheck className="mr-3 h-8 w-8 text-primary" />
          Demo Requests
        </h1>
        <p className="text-muted-foreground">
          Manage and review all incoming demo requests from visitors.
        </p>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
                <CardTitle>Incoming Requests</CardTitle>
                <CardDescription>A log of all submitted demo requests.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <ListFilter className="h-4 w-4 text-muted-foreground"/>
                <Select value={filter} onValueChange={(value) => setFilter(value as any)}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border shadow-sm overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Visitor</TableHead>
                  <TableHead>Type / Company</TableHead>
                  <TableHead>Requested Slot (PHT)</TableHead>
                  <TableHead>Visitor Timezone</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length > 0 ? (
                  filteredRequests.map(req => (
                    <TableRow key={req.id}>
                      <TableCell>
                          <div className="font-medium">{req.name}</div>
                          <div className="text-xs text-muted-foreground">{req.email}</div>
                          <div className="text-xs text-muted-foreground">{req.phone}</div>
                      </TableCell>
                       <TableCell>
                        <Badge variant="outline" className="capitalize">{req.requesterType}</Badge>
                        {req.requesterType === 'company' && req.companyName && (
                          <div className="text-sm text-muted-foreground mt-1">{req.companyName}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(req.preferredDate).toLocaleString('en-US', {
                          timeZone: 'Asia/Manila',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </TableCell>
                      <TableCell>{req.visitorTimezone || 'N/A'}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={cn("text-xs", getStatusBadgeVariant(req.status))}>
                           {getStatusIcon(req.status)}
                           {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleUpdateStatus(req.id, 'pending')} disabled={req.status === 'pending'}>Pending</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(req.id, 'confirmed')} disabled={req.status === 'confirmed'}>Confirmed</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(req.id, 'completed')} disabled={req.status === 'completed'}>Completed</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => confirmDelete(req)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No requests found for the selected filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
       <AlertDialog open={!!requestToDelete} onOpenChange={(isOpen) => { if (!isOpen) setRequestToDelete(null); }}>
        {requestToDelete && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the demo request from "{requestToDelete.name}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className={cn(buttonVariants({ variant: "destructive" }))}>Delete Request</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </div>
  );
}
