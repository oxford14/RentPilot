
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import type { ManagedUser } from '@/lib/types';
import { UsersRound, UserPlus, Edit2, Trash2, ShieldCheck, UserCircle2, UserCog } from 'lucide-react';
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
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';


export default function ClientUserManagementPage() {
  const { managedUsers, deleteManagedUser, clients } = useAppContext();
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<ManagedUser | null>(null);

  const currentClient = useMemo(() => {
    if (!authUser || !authUser.clientId) return null;
    return clients.find(c => c.id === authUser.clientId);
  }, [authUser, clients]);

  useEffect(() => {
    if (authUser && (authUser.isSuperAdmin || !currentClient || !['admin', 'hub-admin'].includes(authUser.role || ''))) {
        toast({variant: "destructive", title: "Access Denied", description: "You do not have permission to view this page."})
        router.push('/');
    }
  }, [authUser, currentClient, router, toast]);


  const handleOpenUserForm = (user?: ManagedUser) => {
    if (!currentClient) return;
    setEditingUser(user || null);
    setIsUserFormOpen(true);
  };

  const handleCloseUserForm = () => {
    setEditingUser(null);
    setIsUserFormOpen(false);
  };

  const confirmDeleteUser = (user: ManagedUser) => {
    setUserToDelete(user);
  };

  const handleDeleteUser = () => {
    if (userToDelete) {
      if (authUser?.username === userToDelete.username && authUser?.clientId === userToDelete.clientId) {
        toast({variant: "destructive", title: "Action Denied", description: "Client admins cannot delete their own accounts."});
        setUserToDelete(null);
        return;
      }
      deleteManagedUser(userToDelete.id);
      toast({ title: "User Deleted", description: `User ${userToDelete.username} has been deleted.` });
      setUserToDelete(null);
    }
  };

  const getRoleIcon = (role?: string) => {
    if (role === 'admin') return <ShieldCheck className="h-4 w-4 text-primary mr-1" />;
    if (role === 'hub-admin') return <UserCog className="h-4 w-4 text-primary mr-1" />;
    return <UserCircle2 className="h-4 w-4 text-muted-foreground mr-1" />;
  };

  const formatRoleName = (role?: string) => {
    if (role === 'hub-admin') return 'Hub Admin';
    if (role && typeof role === 'string' && role.length > 0) {
      return role.charAt(0).toUpperCase() + role.slice(1);
    }
    return 'N/A';
  };

  if (!authUser || authUser.isSuperAdmin || !currentClient || !['admin', 'hub-admin'].includes(authUser.role || '')) {
    return <div className="container mx-auto py-2"><p>Loading or unauthorized...</p></div>;
  }

  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-headline">User Management for {currentClient.name}</h1>
        <p className="text-muted-foreground">Manage user accounts and roles for your organization.</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center">
              <UsersRound className="mr-2 h-6 w-6 text-primary" />
              Users ({managedUsers.length})
            </CardTitle>
            <Button
              variant="default"
              size="sm"
              onClick={() => handleOpenUserForm()}
              className="shadow-md hover:shadow-lg transition-shadow"
            >
              <UserPlus className="mr-2 h-4 w-4" /> Add New User
            </Button>
          </div>
          <CardDescription>
            Below is a list of users associated with {currentClient.name}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {managedUsers.length > 0 ? (
            <ul className="space-y-3">
              {managedUsers.map((user) => (
                <li key={user.id} className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors flex justify-between items-center shadow-sm">
                  <div>
                    <p className="font-semibold text-lg">{user.username}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                     <Badge variant="outline" className="mt-1 text-xs">
                        {getRoleIcon(user.role)}
                        {formatRoleName(user.role)}
                     </Badge>
                  </div>
                  <div className="space-x-1">
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => handleOpenUserForm(user)} title="Edit User">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="sm" className="h-8 w-8 p-0" onClick={() => confirmDeleteUser(user)} title="Delete User"
                     disabled={authUser?.username === user.username && authUser?.clientId === user.clientId} 
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <UsersRound className="mx-auto h-12 w-12 mb-4 text-gray-400" />
              <p className="text-xl">No users found for {currentClient.name}.</p>
              <p>Click "Add New User" to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {isUserFormOpen && currentClient && (
        <ManagedUserForm
          isOpen={isUserFormOpen}
          onClose={handleCloseUserForm}
          targetClientId={currentClient.id}
          targetClientName={currentClient.name}
          user={editingUser}
        />
      )}

      <AlertDialog open={!!userToDelete} onOpenChange={(isOpen) => { if (!isOpen) setUserToDelete(null); }}>
        {userToDelete && currentClient && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the user "{userToDelete.username}" from {currentClient.name}.
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
