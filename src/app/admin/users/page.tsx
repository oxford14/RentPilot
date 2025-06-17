
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/contexts/AppContext';
import type { Client, ManagedUser } from '@/lib/types';
import { UsersRound, UserPlus, Building, Edit2, Trash2, ShieldCheck, UserCircle2 } from 'lucide-react';
import { ManagedUserForm } from '@/components/admin/ManagedUserForm';
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
import { Badge } from '@/components/ui/badge';

export default function AdminUsersPage() {
  const { clients, deleteManagedUser, rawManagedUsers } = useAppContext();
  const { toast } = useToast();
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [selectedClientForUserForm, setSelectedClientForUserForm] = useState<Client | null>(null);
  const [userToDelete, setUserToDelete] = useState<ManagedUser | null>(null);


  const handleOpenUserForm = (client: Client, user?: ManagedUser) => {
    setSelectedClientForUserForm(client);
    setEditingUser(user || null);
    setIsUserFormOpen(true);
  };

  const handleCloseUserForm = () => {
    setSelectedClientForUserForm(null);
    setEditingUser(null);
    setIsUserFormOpen(false);
  };

  const confirmDeleteUser = (user: ManagedUser) => {
    setUserToDelete(user);
  };

  const handleDeleteUser = () => {
    if (userToDelete) {
      deleteManagedUser(userToDelete.id);
      toast({ title: "User Deleted", description: `User ${userToDelete.username} has been deleted.` });
      setUserToDelete(null);
    }
  };

  const getRoleIcon = (role: string) => {
    if (role === 'admin') return <ShieldCheck className="h-4 w-4 text-primary mr-1" />;
    return <UserCircle2 className="h-4 w-4 text-muted-foreground mr-1" />;
  };

  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-headline">All Client User Management (Super Admin)</h1>
        <p className="text-muted-foreground">Manage user accounts and roles for all client organizations.</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <UsersRound className="mr-2 h-6 w-6 text-primary" />
            User Administration by Client
          </CardTitle>
          <CardDescription>
            Expand a client to view their users or add new ones. Set roles for client users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clients.length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {clients.map((client) => {
                const clientUsers = rawManagedUsers.filter(user => user.clientId === client.id);
                return (
                  <AccordionItem value={client.id} key={client.id}>
                    <AccordionTrigger className="hover:bg-muted/50 px-4 py-3 rounded-md transition-colors">
                      <div className="flex items-center gap-2">
                        <Building className="h-5 w-5 text-muted-foreground" />
                        <span className="font-semibold text-lg">{client.name}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-4 px-4 space-y-3 bg-muted/30 rounded-b-md border-t">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-md font-semibold flex items-center">
                          <UsersRound className="mr-2 h-5 w-5 text-primary" /> Users for {client.name} ({clientUsers.length})
                        </h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenUserForm(client)}
                          className="shadow-sm hover:shadow-md transition-shadow"
                        >
                          <UserPlus className="mr-2 h-4 w-4" /> Add User to {client.name}
                        </Button>
                      </div>
                      {clientUsers.length > 0 ? (
                        <ul className="space-y-2 pl-2 border-l-2 border-primary/50 ml-2">
                          {clientUsers.map((user) => (
                            <li key={user.id} className="p-2 rounded-md hover:bg-background transition-colors flex justify-between items-center">
                              <div>
                                <p className="font-medium">{user.username}</p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                                <Badge variant="outline" className="mt-1 text-xs">
                                  {getRoleIcon(user.role)}
                                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                </Badge>
                              </div>
                              <div className="space-x-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenUserForm(client, user)} title="Edit User">
                                  <Edit2 className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => confirmDeleteUser(user)} title="Delete User">
                                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors" />
                                </Button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground pl-4 py-2">No users found for this client.</p>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <Building className="mx-auto h-16 w-16 mb-4" />
              <p className="text-xl">No clients found.</p>
              <p>Please add clients first via the 'Client Management' page.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {isUserFormOpen && selectedClientForUserForm && (
        <ManagedUserForm
          isOpen={isUserFormOpen}
          onClose={handleCloseUserForm}
          targetClientId={selectedClientForUserForm.id}
          targetClientName={selectedClientForUserForm.name}
          user={editingUser}
        />
      )}

      <AlertDialog open={!!userToDelete} onOpenChange={(isOpen) => { if (!isOpen) setUserToDelete(null); }}>
        {userToDelete && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the user "{userToDelete.username}" for client "{clients.find(c => c.id === userToDelete.clientId)?.name}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteUser}>Delete User</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>

    </div>
  );
}
