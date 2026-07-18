
"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAppContext } from '@/contexts/AppContext';
import type { Client } from '@/lib/types';
import { PlusCircle, Edit, Trash2, Eye, ImageOff, Eraser, CheckCircle2, XCircle } from 'lucide-react';
import { ClientForm } from '@/components/admin/ClientForm';
import { useToast } from "@/hooks/use-toast";
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
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function AdminClientsPage() {
  const { clients, deleteClient, setViewMode, cleanClientData } = useAppContext();
  const router = useRouter();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [clientToClean, setClientToClean] = useState<Client | null>(null);
  const { toast } = useToast();

  const handleOpenForm = (client?: Client) => {
    setEditingClient(client || null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setEditingClient(null);
    setIsFormOpen(false);
  };
  
  const handleViewAsClient = (client: Client, targetPath: string = '/') => {
    setViewMode(client.id);
    router.push(targetPath); 
    toast({ title: "Viewing as Client", description: `Now viewing data for ${client.name}.`});
  }
  
  const confirmDeleteClient = (client: Client) => {
    setClientToDelete(client);
  };

  const handleDeleteClient = () => {
    if (clientToDelete) {
      deleteClient(clientToDelete.id);
      toast({ title: "Client Deleted", description: `${clientToDelete.name} has been deleted.`});
      setClientToDelete(null); 
    }
  };

  const confirmCleanClient = (client: Client) => {
    setClientToClean(client);
  };

  const handleCleanClient = async () => {
    if (clientToClean) {
      await cleanClientData(clientToClean.id);
      setClientToClean(null);
    }
  };


  return (
    <div className="container mx-auto py-2 space-y-6">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-bold font-headline">Client Management</CardTitle>
              <CardDescription>Manage client organizations using Rental Pilot.</CardDescription>
            </div>
            <Button onClick={() => handleOpenForm()} variant="default" className="shadow-md hover:shadow-lg transition-shadow">
              <PlusCircle className="mr-2 h-5 w-5" /> Add New Client
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {clients.length > 0 ? (
            <div className="rounded-lg border shadow-sm overflow-hidden bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Logo</TableHead>
                    <TableHead>Client Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Subscription Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell>
                        {client.logoUrl ? (
                          <Image 
                            src={client.logoUrl} 
                            alt={`${client.name} logo`} 
                            width={120} 
                            height={45} 
                            className="object-contain rounded"
                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/120x45.png'; (e.target as HTMLImageElement).alt = 'Error loading logo'; }}
                            data-ai-hint="client logo"
                          />
                        ) : (
                          <div className="w-[120px] h-[45px] flex items-center justify-center bg-muted rounded text-muted-foreground">
                            <ImageOff className="h-8 w-8" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                            {client.businessType?.replace('_', ' ') || 'Standard'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={client.subscriptionStatus === 'active' ? 'default' : 'secondary'} className={client.subscriptionStatus === 'active' ? 'bg-green-500/20 text-green-700 border-green-400' : 'bg-red-500/20 text-red-700 border-red-400'}>
                          {client.subscriptionStatus === 'active' ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <XCircle className="mr-1 h-3 w-3" />}
                          {client.subscriptionStatus ? client.subscriptionStatus.charAt(0).toUpperCase() + client.subscriptionStatus.slice(1) : 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewAsClient(client)} title="View as Client">
                           <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleOpenForm(client)} title="Edit Client">
                           <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => confirmCleanClient(client)} title="Clean Client Data">
                           <Eraser className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => confirmDeleteClient(client)} title="Delete Client">
                           <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No clients found. Add a new client to get started.</p>
          )}
        </CardContent>
      </Card>

      {isFormOpen && (
        <ClientForm
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          client={editingClient}
        />
      )}

      <AlertDialog open={!!clientToDelete} onOpenChange={(isOpen) => {
        if (!isOpen) {
          setTenantToDelete(null);
        }
      }}>
        {clientToDelete && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the client "{clientToDelete.name}" and all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteClient} className={cn(buttonVariants({ variant: "destructive" }))}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>

      <AlertDialog open={!!clientToClean} onOpenChange={(isOpen) => {
        if (!isOpen) {
          setClientToClean(null);
        }
      }}>
        {clientToClean && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete ALL renters, payments, and expenses associated with the client "{clientToClean.name}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleCleanClient} className={cn(buttonVariants({ variant: "destructive" }))}>Clean Data</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </div>
  );
}
