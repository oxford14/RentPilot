
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAppContext } from '@/contexts/AppContext';
import type { SuperAdminUser } from '@/lib/types';
import { UserPlus, Edit, Trash2, ShieldCheck } from 'lucide-react';
import { SuperAdminUserForm } from '@/components/admin/SuperAdminUserForm'; 
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
import { useAuth } from '@/contexts/AuthContext';

export default function SuperAdminUsersPage() {
  const { rawSuperAdminUsers, deleteSuperAdminUser } = useAppContext();
  const { user: authUser } = useAuth();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SuperAdminUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<SuperAdminUser | null>(null);

  const handleOpenForm = (user?: SuperAdminUser) => {
    setEditingUser(user || null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setEditingUser(null);
    setIsFormOpen(false);
  };
  
  const confirmDeleteUser = (user: SuperAdminUser) => {
    if (authUser?.username === user.username) {
      toast({
        variant: "destructive",
        title: "Action Denied",
        description: "Super admins cannot delete their own active account.",
      });
      return;
    }
    setUserToDelete(user);
  };

  const handleDeleteUser = () => {
    if (userToDelete) {
      deleteSuperAdminUser(userToDelete.id);
      toast({ title: "Super Admin Deleted", description: `Super admin ${userToDelete.username} has been deleted.`});
      setUserToDelete(null); 
    }
  };

  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-headline">Super Admin User Management</h1>
        <p className="text-muted-foreground">Manage users with global super administrative privileges.</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center text-xl">
                <ShieldCheck className="mr-2 h-6 w-6 text-primary" />
                Super Admin Accounts ({rawSuperAdminUsers.length})
              </CardTitle>
              <CardDescription>
                These users have full access to all system features and client data.
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenForm()} variant="default" className="shadow-md hover:shadow-lg transition-shadow">
              <UserPlus className="mr-2 h-5 w-5" /> Add New Super Admin
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {rawSuperAdminUsers.length > 0 ? (
            <div className="rounded-lg border shadow-sm overflow-hidden bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rawSuperAdminUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleOpenForm(user)} title="Edit Super Admin">
                           <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => confirmDeleteUser(user)} 
                          title="Delete Super Admin"
                          disabled={authUser?.username === user.username}
                        >
                           <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <ShieldCheck className="mx-auto h-12 w-12 mb-4 text-gray-400" />
              <p className="text-xl">No Additional Super Admins Found</p>
              <p>Click "Add New Super Admin" to create one. The primary 'admin' account is not listed here.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {isFormOpen && (
        <SuperAdminUserForm
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          user={editingUser}
        />
      )}

      <AlertDialog open={!!userToDelete} onOpenChange={(isOpen) => {
        if (!isOpen) {
          setUserToDelete(null);
        }
      }}>
        {userToDelete && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the super admin account "{userToDelete.username}". 
                They will lose all administrative access.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteUser}>Delete Super Admin</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </div>
  );
}
