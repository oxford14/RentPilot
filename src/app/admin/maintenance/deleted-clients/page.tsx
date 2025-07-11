
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/contexts/AppContext';
import type { DeletedClientBackup } from '@/lib/types';
import { Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function DeletedClientsPage() {
  const { rawDeletedClients, restoreClient, permanentlyDeleteClientBackup } = useAppContext();
  const { toast } = useToast();
  const [clientToRestore, setClientToRestore] = useState<DeletedClientBackup | null>(null);
  const [clientToDelete, setClientToDelete] = useState<DeletedClientBackup | null>(null);

  const handleRestore = async () => {
    if (!clientToRestore) return;
    await restoreClient(clientToRestore.id);
    setClientToRestore(null);
  };

  const handlePermanentDelete = async () => {
    if (!clientToDelete) return;
    await permanentlyDeleteClientBackup(clientToDelete.id);
    setClientToDelete(null);
  };

  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-headline flex items-center">
          <Trash2 className="mr-3 h-8 w-8 text-primary" />
          Deleted Clients (Recycle Bin)
        </h1>
        <p className="text-muted-foreground">Restore soft-deleted clients or delete them permanently.</p>
      </div>

      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>
          Permanent deletion is irreversible and will erase all client data from the backup.
        </AlertDescription>
      </Alert>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Soft-Deleted Clients</CardTitle>
          <CardDescription>A list of clients that have been moved to the recycle bin.</CardDescription>
        </CardHeader>
        <CardContent>
          {rawDeletedClients.length > 0 ? (
            <div className="rounded-lg border shadow-sm overflow-hidden bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client Name</TableHead>
                    <TableHead>Deleted On</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rawDeletedClients.map((backup) => (
                    <TableRow key={backup.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">{backup.clientData.name}</TableCell>
                      <TableCell>{format(new Date(backup.deletedAt), 'PPp')}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => setClientToRestore(backup)}>
                           <RotateCcw className="mr-2 h-4 w-4" /> Restore
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => setClientToDelete(backup)}>
                           <Trash2 className="mr-2 h-4 w-4" /> Delete Permanently
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">The recycle bin is empty.</p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!clientToRestore} onOpenChange={(isOpen) => !isOpen && setClientToRestore(null)}>
        {clientToRestore && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Restore Client "{clientToRestore.clientData.name}"?</AlertDialogTitle>
              <AlertDialogDescription>
                This will restore the client and all associated data back into the live application.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRestore}>Restore</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>

      <AlertDialog open={!!clientToDelete} onOpenChange={(isOpen) => !isOpen && setClientToDelete(null)}>
        {clientToDelete && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will <strong className="text-destructive">permanently delete</strong> the client "{clientToDelete.clientData.name}" and all of their data from the backup. This action is irreversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handlePermanentDelete} className={cn(buttonVariants({ variant: "destructive" }))}>Delete Permanently</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </div>
  );
}
