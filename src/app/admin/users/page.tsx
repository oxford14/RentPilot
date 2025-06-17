
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/contexts/AppContext';
import type { Client, ManagedUser } from '@/lib/types';
import { UsersRound, UserPlus, Users, Building } from 'lucide-react';
// import { ManagedUserForm } from '@/components/admin/ManagedUserForm'; // Will be created later

export default function AdminUsersPage() {
  const { clients, managedUsers } = useAppContext();
  // const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  // const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  // const [selectedClientForUser, setSelectedClientForUser] = useState<Client | null>(null);

  // const handleOpenUserForm = (client: Client, user?: ManagedUser) => {
  //   setSelectedClientForUser(client);
  //   setEditingUser(user || null);
  //   setIsUserFormOpen(true);
  // };

  // const handleCloseUserForm = () => {
  //   setSelectedClientForUser(null);
  //   setEditingUser(null);
  //   setIsUserFormOpen(false);
  // };

  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-headline">Client User Management</h1>
        <p className="text-muted-foreground">Manage user accounts for your client organizations.</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <UsersRound className="mr-2 h-6 w-6 text-primary" />
            User Administration by Client
          </CardTitle>
          <CardDescription>
            Expand a client to view their users or add new ones.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clients.length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {clients.map((client) => {
                const clientUsers = managedUsers.filter(user => user.clientId === client.id);
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
                          <Users className="mr-2 h-5 w-5 text-primary" /> Users for {client.name}
                        </h4>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => alert(`'Add User' clicked for ${client.name}`)} // Placeholder action
                          className="shadow-sm hover:shadow-md transition-shadow"
                        >
                          <UserPlus className="mr-2 h-4 w-4" /> Add User to {client.name}
                        </Button>
                      </div>
                      {clientUsers.length > 0 ? (
                        <ul className="space-y-2 pl-2 border-l-2 border-primary/50 ml-2">
                          {clientUsers.map((user) => (
                            <li key={user.id} className="p-2 rounded-md hover:bg-background transition-colors">
                              <p className="font-medium">{user.username}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                              {/* Add Edit/Delete buttons for users later */}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground pl-4">No users found for this client.</p>
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

      {/* {isUserFormOpen && selectedClientForUser && (
        <ManagedUserForm
          isOpen={isUserFormOpen}
          onClose={handleCloseUserForm}
          client={selectedClientForUser}
          user={editingUser}
        />
      )} */}
    </div>
  );
}
