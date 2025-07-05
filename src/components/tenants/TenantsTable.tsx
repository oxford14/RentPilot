
"use client";

import React, { useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, UserCheck, UserX, Edit, Trash2, KeyRound, MessageSquare, RefreshCw, UserSearch, Clock } from 'lucide-react';
import type { Tenant } from '@/lib/types';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { format, addMinutes } from 'date-fns';
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
import { ReminderDialog } from './ReminderDialog';
import { CredentialsDisplayDialog } from './CredentialsDisplayDialog';


interface TenantsTableProps {
  onEditTenant: (tenant: Tenant) => void;
  showInactiveTenants: boolean;
}

export function TenantsTable({ onEditTenant, showInactiveTenants }: TenantsTableProps) {
  const { tenants, clients, updateTenant, attemptDeleteTenant, generateTenantAccount, resetTenantPassword } = useAppContext();
  const { toast } = useToast();
  
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [tenantForReminder, setTenantForReminder] = useState<Tenant | null>(null);
  const [credentials, setCredentials] = useState<{username: string, password?: string} | null>(null);

  const toggleStatus = (tenant: Tenant) => {
    const newStatus = tenant.status === 'active' ? 'inactive' : 'active';
    updateTenant({ ...tenant, status: newStatus });
    toast({ title: "Status Updated", description: `${tenant.name}'s status changed to ${newStatus}.` });
  };

  const confirmDeleteTenant = (tenant: Tenant) => {
    setTenantToDelete(tenant);
  };

  const handleDeleteConfirmed = () => {
    if (tenantToDelete) {
      const result = attemptDeleteTenant(tenantToDelete.id);
      if (result.success) {
        toast({
          title: result.action === 'deleted' ? "Tenant Deleted" : "Tenant Inactivated",
          description: result.message,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Operation Failed",
          description: result.message,
        });
      }
      setTenantToDelete(null);
    }
  };

  const handleGenerateAccount = async (tenant: Tenant) => {
    if (tenant.hasAccount) {
      toast({
        variant: "destructive",
        title: "Account Exists",
        description: "This tenant already has an account.",
      });
      return;
    }
    const result = await generateTenantAccount(tenant.id);
    if (result.success && result.username && result.password) {
      setCredentials({ username: result.username, password: result.password });
    } else {
      toast({
        variant: "destructive",
        title: "Account Generation Failed",
        description: result.message || "An unknown error occurred.",
      });
    }
  };

  const handleResetPassword = async (tenant: Tenant) => {
    const result = await resetTenantPassword(tenant.id);
    if (result.success && result.password && tenant.username) {
      setCredentials({ username: tenant.username, password: result.password });
    } else {
      toast({
        variant: "destructive",
        title: "Password Reset Failed",
        description: result.message || "An unknown error occurred.",
      });
    }
  };

  const handleViewCredentials = (tenant: Tenant) => {
    if (tenant.username) {
      setCredentials({ username: tenant.username });
    } else {
      toast({
        variant: "destructive",
        title: "Account Not Found",
        description: "This tenant does not have a login account yet. Please generate one first.",
      });
    }
  };

  const handleOpenReminder = (tenant: Tenant) => {
    setTenantForReminder(tenant);
    setIsReminderOpen(true);
  };

  const displayedTenants = useMemo(() => {
    let filtered = tenants;
    if (!showInactiveTenants) {
      filtered = tenants.filter(tenant => tenant.status === 'active');
    }
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [tenants, showInactiveTenants]);

  const clientNameForGreeting = useMemo(() => {
    const firstTenant = displayedTenants.length > 0 ? displayedTenants[0] : null;
    if (firstTenant && firstTenant.clientId) {
        const client = clients.find(c => c.id === firstTenant.clientId);
        return client?.name || "your landlord";
    }
    return "your landlord";
  }, [displayedTenants, clients]);

  const formatUtcDate = (dateString: string) => {
    const date = new Date(dateString);
    const utcDate = addMinutes(date, date.getTimezoneOffset());
    return format(utcDate, "PP");
  };

  if (!displayedTenants || displayedTenants.length === 0) {
    const message = showInactiveTenants 
      ? "No tenants found. Add a new tenant to get started."
      : "No active tenants found. Toggle the switch to show inactive tenants or add a new active tenant.";
    return <p className="text-center text-muted-foreground py-8">{message}</p>;
  }

  return (
    <>
      <div className="rounded-lg border shadow-sm overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="hidden md:table-cell">Phone</TableHead>
              <TableHead className="text-right">Rent (₱)</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="hidden md:table-cell text-center">Join Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedTenants.map((tenant) => (
              <TableRow key={tenant.id} className="hover:bg-muted/50 transition-colors">
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <span>{tenant.name}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{tenant.email}</TableCell>
                <TableCell className="hidden md:table-cell">{tenant.phone}</TableCell>
                <TableCell className="text-right">{tenant.monthlyRentalRate.toLocaleString()}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={tenant.status === 'active' ? 'default' : 'secondary'} className={tenant.status === 'active' ? 'bg-green-500/20 text-green-700 border-green-400' : 'bg-red-500/20 text-red-700 border-red-400'}>
                    {tenant.status === 'active' ? <UserCheck className="h-3 w-3 mr-1" /> : <UserX className="h-3 w-3 mr-1" />}
                    {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell text-center">{formatUtcDate(tenant.joinDate)}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEditTenant(tenant)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      {tenant.status === 'active' && (
                        <DropdownMenuItem onClick={() => handleOpenReminder(tenant)}>
                          <MessageSquare className="mr-2 h-4 w-4" /> Send Reminder
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      {tenant.hasAccount ? (
                        <>
                          <DropdownMenuItem onClick={() => handleViewCredentials(tenant)}>
                            <UserSearch className="mr-2 h-4 w-4" /> View Credentials
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleResetPassword(tenant)}>
                            <RefreshCw className="mr-2 h-4 w-4" /> Reset Tenant Password
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <DropdownMenuItem onClick={() => handleGenerateAccount(tenant)}>
                          <KeyRound className="mr-2 h-4 w-4" /> Generate Tenant Account
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => toggleStatus(tenant)}>
                        {tenant.status === 'active' ? <UserX className="mr-2 h-4 w-4" /> : <UserCheck className="mr-2 h-4 w-4" />}
                        Mark as {tenant.status === 'active' ? 'Inactive' : 'Active'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => confirmDeleteTenant(tenant)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete Tenant
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <AlertDialog open={!!tenantToDelete} onOpenChange={(isOpen) => { if (!isOpen) setTenantToDelete(null); }}>
        {tenantToDelete && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Action for {tenantToDelete.name}</AlertDialogTitle>
              <AlertDialogDescription>
                Proceeding will attempt to remove this tenant. 
                If the tenant has any payment history, they will be marked as inactive. 
                If they have no payment history, they will be permanently deleted. 
                This action cannot be undone for permanent deletions.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setTenantToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirmed} className={buttonVariants({ variant: "destructive" })}>
                Proceed
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>

      <ReminderDialog 
        isOpen={isReminderOpen}
        onClose={() => setIsReminderOpen(false)}
        tenant={tenantForReminder}
      />
      
      {credentials && (
        <CredentialsDisplayDialog
          isOpen={!!credentials}
          onClose={() => setCredentials(null)}
          username={credentials.username}
          password={credentials.password}
          clientName={clientNameForGreeting}
        />
      )}
    </>
  );
}
