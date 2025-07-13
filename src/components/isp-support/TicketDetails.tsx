
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Form, FormField, FormItem } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { TechSupportRequest, TicketStatus, ManagedUser } from '@/lib/types';
import { ticketStatuses } from '@/lib/types';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { format, formatDistanceToNow } from 'date-fns';
import { Ticket, User, Wrench, Calendar, Link as LinkIcon, Info, Save, Loader2, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

const ticketUpdateSchema = z.object({
  status: z.enum(ticketStatuses),
  assignedTechnicianId: z.string().optional(),
  internalNotes: z.string().optional(),
});

type FormValues = z.infer<typeof ticketUpdateSchema>;

const statusColors: Record<TicketStatus, string> = {
  'Pending': 'bg-yellow-500/20 text-yellow-700 border-yellow-400',
  'Assigned': 'bg-blue-500/20 text-blue-700 border-blue-400',
  'In Progress': 'bg-indigo-500/20 text-indigo-700 border-indigo-400',
  'Resolved': 'bg-green-500/20 text-green-700 border-green-400',
  'Closed': 'bg-gray-500/20 text-gray-700 border-gray-400',
};

export function TicketDetails({ ticket }: { ticket: TechSupportRequest }) {
  const router = useRouter();
  const { user } = useAuth();
  const { managedUsers, updateTechSupportRequest } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(ticketUpdateSchema),
    defaultValues: {
      status: ticket.status,
      assignedTechnicianId: ticket.assignedTechnicianId || '',
      internalNotes: ticket.internalNotes || '',
    },
  });

  const availableTechnicians = useMemo(() => {
    return managedUsers.filter(user => user.role === 'technician');
  }, [managedUsers]);
  
  const canManageTicket = user?.isSuperAdmin || user?.role === 'admin';

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    const updates: Partial<TechSupportRequest> = {
      status: data.status,
      assignedTechnicianId: data.assignedTechnicianId || undefined,
      internalNotes: data.internalNotes || '',
    };
    
    const assignedTechnician = availableTechnicians.find(t => t.id === data.assignedTechnicianId);
    updates.assignedTechnicianName = assignedTechnician ? assignedTechnician.username : undefined;

    if (data.status === 'Resolved' && ticket.status !== 'Resolved') {
      updates.resolvedAt = new Date().toISOString();
    }

    try {
      await updateTechSupportRequest(ticket.id, updates);
    } catch(error) {
      // toast is handled in context
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
       <Button variant="outline" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Ticket List
      </Button>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Ticket className="h-6 w-6 text-primary" />
                <span>Ticket Details</span>
              </CardTitle>
              <CardDescription>
                Request from {ticket.subscriberName} on {format(new Date(ticket.createdAt), 'PPP p')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <Badge variant="outline">{ticket.issueType}</Badge>
                <Badge className={statusColors[ticket.status]}>{ticket.status}</Badge>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Description</Label>
                <p className="p-3 bg-muted rounded-md whitespace-pre-wrap">{ticket.description}</p>
              </div>
              {ticket.attachments && ticket.attachments.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Attachments</Label>
                  <ul className="mt-1 space-y-1">
                    {ticket.attachments.map((url, index) => (
                      <li key={index}>
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline flex items-center gap-1">
                          <LinkIcon className="h-4 w-4" />
                          Attachment {index + 1}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Manage Ticket
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <Label>Status</Label>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!canManageTicket}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ticketStatuses.map(status => (
                              <SelectItem key={status} value={status}>{status}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="assignedTechnicianId"
                    render={({ field }) => (
                      <FormItem>
                        <Label>Assign Technician</Label>
                        <Select onValueChange={field.onChange} value={field.value || ''} disabled={!canManageTicket}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a technician..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Unassigned</SelectItem>
                            {availableTechnicians.map(tech => (
                              <SelectItem key={tech.id} value={tech.id}>{tech.username}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="internalNotes"
                    render={({ field }) => (
                      <FormItem>
                        <Label>Internal Notes</Label>
                        <Textarea placeholder="Add notes for your team..." {...field} />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Changes
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
