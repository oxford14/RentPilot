
"use client";

import React, { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Tenant } from '@/lib/types';
import { useAppContext } from '@/contexts/AppContext';
import { Badge } from '@/components/ui/badge';
import { UserCheck, UserX, Search } from 'lucide-react';

interface TenantsListForPaymentsProps {
  onSelectTenant: (tenant: Tenant) => void;
  searchTerm: string;
  selectedTenantId?: string | null;
}

export function TenantsListForPayments({ onSelectTenant, searchTerm, selectedTenantId }: TenantsListForPaymentsProps) {
  const { tenants } = useAppContext();

  const filteredTenants = useMemo(() => {
    let processedTenants = [...tenants].sort((a, b) => a.name.localeCompare(b.name));

    if (searchTerm && searchTerm.trim() !== '') {
      const lowercasedSearchTerm = searchTerm.toLowerCase();
      processedTenants = processedTenants.filter(tenant =>
        tenant.name.toLowerCase().includes(lowercasedSearchTerm) ||
        tenant.email.toLowerCase().includes(lowercasedSearchTerm)
      );
    }
    return processedTenants;
  }, [tenants, searchTerm]);

  if (!filteredTenants || filteredTenants.length === 0) {
    const message = searchTerm && searchTerm.trim() !== ''
      ? "No tenants found matching your search."
      : "No tenants available.";
    return (
      <div className="text-center text-muted-foreground py-8">
        {searchTerm && searchTerm.trim() !== '' && <Search className="mx-auto h-10 w-10 mb-2 text-gray-400" />}
        <p>{message}</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[65vh] min-h-[360px] max-h-[700px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredTenants.map((tenant) => (
            <TableRow
              key={tenant.id}
              onClick={() => onSelectTenant(tenant)}
              className={`cursor-pointer hover:bg-muted/50 transition-colors ${selectedTenantId === tenant.id ? 'bg-primary/10 hover:bg-primary/20' : ''}`}
              aria-selected={selectedTenantId === tenant.id}
            >
              <TableCell className="font-medium">{tenant.name}</TableCell>
              <TableCell className="text-center">
                <Badge variant={tenant.status === 'active' ? 'default' : 'secondary'} className={`text-xs px-1.5 py-0.5 ${tenant.status === 'active' ? 'bg-green-500/20 text-green-700 border-green-400' : 'bg-red-500/20 text-red-700 border-red-400'}`}>
                  {tenant.status === 'active' ? <UserCheck className="h-3 w-3 mr-1 inline-block" /> : <UserX className="h-3 w-3 mr-1 inline-block" />}
                  {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
