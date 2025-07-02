
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppContext } from '@/contexts/AppContext';
import { ClientForm } from '@/components/admin/ClientForm';
import { Award, CheckCircle2, AlertTriangle, Clock, Edit, ListFilter } from 'lucide-react';
import type { Client } from '@/lib/types';
import { format, isPast, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

type SubscriptionStatus = 'Active' | 'Expired' | 'Expiring Soon' | 'Inactive';

export default function AdminSubscriptionsPage() {
  const { clients } = useAppContext();
  const [filter, setFilter] = useState<'all' | 'active' | 'expiring' | 'expired' | 'inactive'>('all');
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
      setIsClient(true);
  }, []);

  const getClientStatus = (client: Client): SubscriptionStatus => {
    if (client.subscriptionStatus === 'inactive') return 'Inactive';
    if (!client.subscriptionEndDate) return 'Active';
    const endDate = new Date(client.subscriptionEndDate);
    if (isPast(endDate)) return 'Expired';
    const daysUntilExpiry = differenceInDays(endDate, new Date());
    if (daysUntilExpiry <= 7) return 'Expiring Soon';
    return 'Active';
  };

  const statusInfo: Record<SubscriptionStatus, { variant: 'default' | 'destructive' | 'secondary', icon: React.ElementType, color: string }> = {
    'Active': { variant: 'default', icon: CheckCircle2, color: 'bg-green-500/20 text-green-700 border-green-400' },
    'Expiring Soon': { variant: 'destructive', icon: Clock, color: 'bg-yellow-500/20 text-yellow-700 border-yellow-400' },
    'Expired': { variant: 'destructive', icon: AlertTriangle, color: 'bg-red-500/20 text-red-700 border-red-400' },
    'Inactive': { variant: 'secondary', icon: AlertTriangle, color: '' },
  };

  const filteredClients = useMemo(() => {
    return clients
      .map(client => ({ ...client, status: getClientStatus(client) }))
      .filter(client => {
        if (filter === 'all') return true;
        if (filter === 'active') return client.status === 'Active';
        if (filter === 'expiring') return client.status === 'Expiring Soon';
        if (filter === 'expired') return client.status === 'Expired';
        if (filter === 'inactive') return client.status === 'Inactive';
        return true;
      })
      .sort((a, b) => new Date(b.subscriptionEndDate || 0).getTime() - new Date(a.subscriptionEndDate || 0).getTime());
  }, [clients, filter]);

  const handleOpenForm = (client: Client) => {
    setEditingClient(client);
    setIsFormOpen(true);
  };
  
  const handleCloseForm = () => {
    setEditingClient(null);
    setIsFormOpen(false);
  };

  return (
    <>
      <div className="container mx-auto py-2 space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold font-headline flex items-center">
            <Award className="mr-3 h-8 w-8 text-primary" />
            Client Subscriptions
          </h1>
          <p className="text-muted-foreground">
            View, assign, and manage client subscriptions.
          </p>
        </div>
        
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                  <CardTitle>Subscription Overview</CardTitle>
                  <CardDescription>A list of all client subscriptions and their status.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                  <ListFilter className="h-4 w-4 text-muted-foreground"/>
                  <Select value={filter} onValueChange={(value) => setFilter(value as any)}>
                      <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Filter by status..." />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="expiring">Expiring Soon</SelectItem>
                          <SelectItem value="expired">Expired</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
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
                    <TableHead>Client Name</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Rate (₱)</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isClient && filteredClients.length > 0 ? (
                    filteredClients.map(client => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell>{client.subscriptionPlanName || 'N/A'}</TableCell>
                        <TableCell>{client.subscriptionRate?.toLocaleString() || 'N/A'}</TableCell>
                        <TableCell>
                          {client.subscriptionEndDate ? format(new Date(client.subscriptionEndDate), 'PP') : 'N/A'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={statusInfo[client.status].variant} className={cn("text-xs", statusInfo[client.status].color)}>
                            <statusInfo[client.status].icon className="h-3 w-3 mr-1" />
                            {client.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => handleOpenForm(client)}>
                            <Edit className="h-4 w-4 mr-2" /> Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        {isClient ? 'No clients found for the selected filter.' : 'Loading subscriptions...'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
      {isFormOpen && (
        <ClientForm
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          client={editingClient}
        />
      )}
    </>
  );
}
