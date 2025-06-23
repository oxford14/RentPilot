
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from '@/contexts/AuthContext';
import { useAppContext } from '@/contexts/AppContext';
import { User, UserCircle, Shield, ShieldCheck, Building, Mail } from 'lucide-react';

export default function ProfilePage() {
  const { user: authUser } = useAuth();
  const { clients } = useAppContext();

  if (!authUser) {
    return (
      <div className="container mx-auto py-8 text-center">
        <p>Loading user profile...</p>
      </div>
    );
  }

  const userInitials = authUser.username ? authUser.username.substring(0, 2).toUpperCase() : 'U';
  const client = authUser.clientId ? clients.find(c => c.id === authUser.clientId) : null;

  const getRoleInfo = () => {
    if (authUser.isSuperAdmin) {
      return { text: "Super Administrator", Icon: ShieldCheck };
    }
    if (authUser.role === 'admin') {
      return { text: "Client Administrator", Icon: Shield };
    }
    return { text: "Client User", Icon: User };
  };

  const { text: roleText, Icon: RoleIcon } = getRoleInfo();
  const PageIcon = authUser.isSuperAdmin || authUser.role === 'admin' ? ShieldCheck : UserCircle;

  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-headline flex items-center">
          <PageIcon className="mr-3 h-8 w-8 text-primary" />
          User Profile
        </h1>
        <p className="text-muted-foreground">View and manage your profile information.</p>
      </div>

      <Card className="shadow-xl">
        <CardHeader className="items-center text-center border-b pb-6">
          <Avatar className="h-24 w-24 mb-4 ring-2 ring-primary ring-offset-2">
            <AvatarImage src="https://firebasestorage.googleapis.com/v0/b/tenanttracker-u4wuw.firebasestorage.app/o/Whisk_storyboard1c1ee4a7bebe492d87191d51%20(2).png?alt=media&token=d8fdb3e6-1585-46ef-bd7a-a632f6b78299" alt={`${authUser.username}'s avatar`} data-ai-hint="user avatar large"/>
            <AvatarFallback className="text-3xl">{userInitials}</AvatarFallback>
          </Avatar>
          <CardTitle className="text-2xl font-headline">{authUser.username}</CardTitle>
          <CardDescription className="flex items-center gap-1">
            <RoleIcon className="h-4 w-4 text-muted-foreground" /> {roleText}
          </CardDescription>
          {client && (
            <CardDescription className="flex items-center gap-1 mt-1">
              <Building className="h-4 w-4 text-muted-foreground" /> {client.name}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center">
            <Mail className="mr-3 h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Email (Example)</p>
              <p className="font-medium">
                {authUser.username.toLowerCase().replace(/\s+/g, '.')}@example.com
              </p>
            </div>
          </div>
          
          <div className="border-t pt-4 mt-4">
             <p className="text-sm text-muted-foreground">
                Profile editing functionality (like changing password or email) is not yet implemented.
             </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
