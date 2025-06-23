
"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAppContext } from '@/contexts/AppContext';
import type { Client } from '@/lib/types';
import { PlusCircle, Edit, Trash2, Eye, ImageOff } from 'lucide-react';
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

export default function AdminClientsPage() {
  const { clients, deleteClient, setViewMode } = useAppContext();
  const router = useRouter();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const { toast } = useToast();

  const handleOpenForm = (client?: Client) => {
    setEditingClient(client || null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setEditingClient(null);
    setIsFormOpen(false);
  };
  
  const handleViewAsClient = (client: Client) => {
    setViewMode(client.id);
    router.push('/'); 
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


  return (
    <div className="container mx-auto py-2 space-y-6">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-bold font-headline">Client Management</CardTitle>
              <CardDescription>Manage client organizations using RentPilot.</CardDescription>
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
                            width={240} 
                            height={90} 
                            className="object-contain rounded"
                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/240x90.png?text=Error'; (e.target as HTMLImageElement).alt = 'Error loading logo'; }}
                            data-ai-hint="client logo"
                          />
                        ) : (
                          <div className="w-[240px] h-[90px] flex items-center justify-center bg-muted rounded text-muted-foreground">
                            <ImageOff className="h-8 w-8" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewAsClient(client)} title="View as Client">
                           <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleOpenForm(client)} title="Edit Client">
                           <Edit className="h-4 w-4" />
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
          setClientToDelete(null);
        }
      }}>
        {clientToDelete && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the client "{clientToDelete.name}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteClient}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </div>
  );
}
