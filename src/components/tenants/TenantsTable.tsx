
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
import { MoreHorizontal, UserCheck, UserX, Edit, Trash2, KeyRound, MessageSquare, RefreshCw, UserSearch, FileUp, FileText as FileViewIcon, ArrowUp, ArrowDown, CalendarClock } from 'lucide-react';
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
import { UploadContractDialog } from './UploadContractDialog';
import { RenewContractDialog } from './RenewContractDialog';
import { cn } from '@/lib/utils';
import Link from 'next/link';


interface TenantsTableProps {
  onEditTenant: (tenant: Tenant) => void;
  showInactiveTenants: boolean;
}

type SortKey = 'name' | 'joinDate' | 'contractEndDate';
type SortDirection = 'ascending' | 'descending';

export function TenantsTable({ onEditTenant, showInactiveTenants }: TenantsTableProps) {
  const { tenants, clients, updateTenant, attemptDeleteTenant, generateTenantAccount, resetTenantPassword, deleteSignedContract, activeClient, terminology } = useAppContext();
  const { toast } = useToast();
  
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
  const [tenantToDeleteContract, setTenantToDeleteContract] = useState<Tenant | null>(null);
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [tenantForReminder, setTenantForReminder] = useState<Tenant | null>(null);
  const [credentials, setCredentials] = useState<{username: string, password?: string} | null>(null);
  const [isUploadContractOpen, setIsUploadContractOpen] = useState(false);
  const [tenantForUpload, setTenantForUpload] = useState<Tenant | null>(null);
  const [isRenewContractOpen, setIsRenewContractOpen] = useState(false);
  const [tenantForRenew, setTenantForRenew] = useState<Tenant | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'name', direction: 'ascending' });

  const isVehicleRental = activeClient?.businessType === 'Vehicle_Rental';

  const toggleStatus = (tenant: Tenant) => {
    const newStatus = tenant.status === 'active' ? 'inactive' : 'active';
    updateTenant({ ...tenant, status: newStatus });
    toast({ title: "Status Updated", description: `${tenant.name}'s status changed to ${newStatus}.` });
  };

  const confirmDeleteTenant = (tenant: Tenant) => {
    setTenantToDelete(tenant);
  };

  const handleDeleteConfirmed = async () => {
    if (tenantToDelete) {
      const result = await attemptDeleteTenant(tenantToDelete.id);
      if (result.success) {
        toast({
          title: result.action === 'deleted' ? `${terminology.single} Deleted` : `${terminology.single} Inactivated`,
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
        description: "This account is already active.",
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
        description: `This ${terminology.single.toLowerCase()} does not have a login account yet.`,
      });
    }
  };

  const handleOpenReminder = (tenant: Tenant) => {
    setTenantForReminder(tenant);
    setIsReminderOpen(true);
  };

  const handleOpenUploadContract = (tenant: Tenant) => {
    setTenantForUpload(tenant);
    setIsUploadContractOpen(true);
  };

  const handleOpenRenewContract = (tenant: Tenant) => {
    setTenantForRenew(tenant);
    setIsRenewContractOpen(true);
  };

  const handleOpenDeleteContract = (tenant: Tenant) => {
    setTenantToDeleteContract(tenant);
  };

  const handleConfirmDeleteContract = async () => {
    if (!tenantToDeleteContract) return;
    await deleteSignedContract(tenantToDeleteContract.id);
    setTenantToDeleteContract(null);
  };

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const displayedTenants = useMemo(() => {
    const desiredStatus = showInactiveTenants ? 'inactive' : 'active';
    let filtered = [...tenants].filter(tenant => tenant.status === desiredStatus);

    filtered.sort((a, b) => {
      let aValue: string | number | Date | null = '';
      let bValue: string | number | Date | null = '';

      if (sortConfig.key === 'name') {
        aValue = a.name;
        bValue = b.name;
      } else if (sortConfig.key === 'joinDate') {
        aValue = new Date(a.joinDate);
        bValue = new Date(b.joinDate);
      } else if (sortConfig.key === 'contractEndDate') {
        aValue = a.contractEndDate ? new Date(a.contractEndDate) : null;
        bValue = b.contractEndDate ? new Date(b.contractEndDate) : null;
      }

      if (aValue === null) return 1;
      if (bValue === null) return -1;
      if (aValue === bValue) return 0;

      if (sortConfig.direction === 'ascending') {
        return aValue < bValue ? -1 : 1;
      } else {
        return aValue > bValue ? -1 : 1;
      }
    });

    return filtered;
  }, [tenants, showInactiveTenants, sortConfig]);

  const clientNameForGreeting = useMemo(() => {
    const firstTenant = displayedTenants.length > 0 ? displayedTenants[0] : null;
    if (firstTenant && firstTenant.clientId) {
        const client = clients.find(c => c.id === firstTenant.clientId);
        return client?.name || "the rental manager";
    }
    return "the rental manager";
  }, [displayedTenants, clients]);

  const formatUtcDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const utcDate = addMinutes(date, date.getTimezoneOffset());
    return format(utcDate, "PP");
  };

  const getSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  if (!displayedTenants || displayedTenants.length === 0) {
    const message = showInactiveTenants 
      ? `No inactive ${terminology.plural.toLowerCase()} found.`
      : `No active ${terminology.plural.toLowerCase()} found.`;
    return <p className="text-center text-muted-foreground py-8">{message}</p>;
  }

  return (
    <>
      <div className="rounded-lg border shadow-sm overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                 <Button variant="ghost" onClick={() => requestSort('name')} className="px-1">
                   Name {getSortIcon('name')}
                 </Button>
              </TableHead>
              {isVehicleRental ? (
                <>
                  <TableHead className="hidden sm:table-cell">Phone</TableHead>
                  <TableHead>Status</TableHead>
                </>
              ) : (
                <>
                  <TableHead className="hidden md:table-cell">Phone</TableHead>
                  <TableHead className="text-right">Rent (₱)</TableHead>
                  <TableHead className="hidden md:table-cell text-center">
                     <Button variant="ghost" onClick={() => requestSort('joinDate')} className="px-1">
                        Join Date {getSortIcon('joinDate')}
                     </Button>
                  </TableHead>
                  <TableHead className="hidden md:table-cell text-center">
                     <Button variant="ghost" onClick={() => requestSort('contractEndDate')} className="px-1">
                        Contract End {getSortIcon('contractEndDate')}
                     </Button>
                  </TableHead>
                </>
              )}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedTenants.map((tenant) => {
              const renterStatus = tenant.status === 'active'
                ? { label: 'Active', color: 'bg-green-500/20 text-green-700 border-green-400' }
                : { label: 'Inactive', color: 'bg-gray-500/20 text-gray-700 border-gray-400' };
              return (
                <TableRow key={tenant.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                        <span>{tenant.name}</span>
                       <span className="text-xs text-muted-foreground">{tenant.email}</span>
                    </div>
                  </TableCell>
                  {isVehicleRental ? (
                    <>
                      <TableCell className="hidden sm:table-cell">{tenant.phone}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-xs", renterStatus.color)}>
                          {renterStatus.label}
                        </Badge>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="hidden md:table-cell">{tenant.phone}</TableCell>
                      <TableCell className="text-right">{tenant.monthlyRentalRate.toLocaleString()}</TableCell>
                      <TableCell className="hidden md:table-cell text-center">
                        {formatUtcDate(tenant.joinDate)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-center">
                        <Badge variant={tenant.signedContractUrl ? "outline" : "secondary"} className="gap-1">
                          {tenant.signedContractUrl && <FileViewIcon className="h-3 w-3" />}
                          {formatUtcDate(tenant.contractEndDate)}
                        </Badge>
                      </TableCell>
                    </>
                  )}
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
                         <DropdownMenuItem asChild>
                            <Link href={`/contract/sign/${tenant.id}`}>
                              <Edit className="mr-2 h-4 w-4" /> Request Digital Signature
                            </Link>
                          </DropdownMenuItem>
                         <DropdownMenuItem onClick={() => handleOpenUploadContract(tenant)} disabled={!!tenant.signedContractUrl}>
                          <FileUp className="mr-2 h-4 w-4" /> Upload Signed Contract
                        </DropdownMenuItem>
                        {tenant.signedContractUrl && (
                          <>
                             <DropdownMenuItem onClick={() => handleOpenRenewContract(tenant)}>
                                  <RefreshCw className="mr-2 h-4 w-4" /> Renew Contract
                             </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <a href={tenant.signedContractUrl} target="_blank" rel="noopener noreferrer">
                                  <FileViewIcon className="mr-2 h-4 w-4" />
                                  <span>View Signed Contract</span>
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenDeleteContract(tenant)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Contract
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        {tenant.hasAccount ? (
                          <>
                            <DropdownMenuItem onClick={() => handleViewCredentials(tenant)}>
                              <UserSearch className="mr-2 h-4 w-4" /> View Credentials
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleResetPassword(tenant)}>
                              <RefreshCw className="mr-2 h-4 w-4" /> Reset Password
                            </DropdownMenuItem>
                          </>
                        ) : (
                          <DropdownMenuItem onClick={() => handleGenerateAccount(tenant)}>
                            <KeyRound className="mr-2 h-4 w-4" /> Generate Account
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => toggleStatus(tenant)}>
                          {tenant.status === 'active' ? <UserX className="mr-2 h-4 w-4" /> : <UserCheck className="mr-2 h-4 w-4" />}
                          Mark as {tenant.status === 'active' ? 'Inactive' : 'Active'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => confirmDeleteTenant(tenant)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete {terminology.single}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <AlertDialog open={!!tenantToDelete} onOpenChange={(isOpen) => { if (!isOpen) setTenantToDelete(null); }}>
        {tenantToDelete && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Action for {tenantToDelete.name}</AlertDialogTitle>
              <AlertDialogDescription>
                Proceeding will attempt to remove this {terminology.single.toLowerCase()}. 
                If they have any payment history, they will be marked as inactive. 
                If they have no payment history, they will be permanently deleted.
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

      <AlertDialog open={!!tenantToDeleteContract} onOpenChange={(isOpen) => { if (!isOpen) setTenantToDeleteContract(null); }}>
        {tenantToDeleteContract && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Contract for {tenantToDeleteContract.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the signed rental contract from storage.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setTenantToDeleteContract(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDeleteContract} className={buttonVariants({ variant: "destructive" })}>
                Delete Contract
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

      {isUploadContractOpen && (
        <UploadContractDialog 
            isOpen={isUploadContractOpen}
            onClose={() => setIsUploadContractOpen(false)}
            tenant={tenantForUpload}
        />
      )}

      {isRenewContractOpen && (
        <RenewContractDialog
            isOpen={isRenewContractOpen}
            onClose={() => setIsRenewContractOpen(false)}
            tenant={tenantForRenew}
        />
      )}
    </>
  );
}
