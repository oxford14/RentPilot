
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
import { Badge } from '@/components/ui/badge';
import type { Payment, Tenant } from '@/lib/types';
import { useAppContext } from '@/contexts/AppContext';
import { CreditCard, Landmark, DollarSign, HelpCircle, Search } from 'lucide-react';

const PaymentMethodIcon = ({ method }: { method: string }) => {
  switch (method) {
    case 'Credit Card': return <CreditCard className="h-4 w-4 text-blue-500" />;
    case 'Bank Transfer': return <Landmark className="h-4 w-4 text-green-500" />;
    case 'Cash': return <DollarSign className="h-4 w-4 text-yellow-500" />;
    default: return <HelpCircle className="h-4 w-4 text-gray-500" />;
  }
};

interface PaymentsTableProps {
  searchTerm?: string;
}

export function PaymentsTable({ searchTerm }: PaymentsTableProps) {
  const { payments, tenants } = useAppContext();

  const getTenantName = (tenantId: string): string => {
    const tenant = tenants.find(t => t.id === tenantId);
    return tenant ? tenant.name : 'Unknown Tenant';
  };

  const filteredAndSortedPayments = useMemo(() => {
    let processedPayments = [...payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (searchTerm && searchTerm.trim() !== '') {
      const lowercasedSearchTerm = searchTerm.toLowerCase();
      processedPayments = processedPayments.filter(payment =>
        getTenantName(payment.tenantId).toLowerCase().includes(lowercasedSearchTerm)
      );
    }
    return processedPayments;
  }, [payments, searchTerm, tenants]);


  if (!filteredAndSortedPayments || filteredAndSortedPayments.length === 0) {
    const message = searchTerm && searchTerm.trim() !== ''
      ? "No payments found matching your search."
      : "No payments recorded yet. Add a payment to see it here.";
    return (
      <div className="text-center text-muted-foreground py-8">
        {searchTerm && searchTerm.trim() !== '' && <Search className="mx-auto h-10 w-10 mb-2 text-gray-400" />}
        <p>{message}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border shadow-sm overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tenant</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Amount ($)</TableHead>
            <TableHead className="text-center">Method</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredAndSortedPayments.map((payment) => (
            <TableRow key={payment.id} className="hover:bg-muted/50 transition-colors">
              <TableCell className="font-medium">{getTenantName(payment.tenantId)}</TableCell>
              <TableCell>{new Date(payment.date).toLocaleDateString()}</TableCell>
              <TableCell className="text-right">{payment.amount.toLocaleString()}</TableCell>
              <TableCell className="text-center">
                <Badge variant="outline" className="flex items-center justify-center gap-1 py-1 px-2 text-xs">
                  <PaymentMethodIcon method={payment.paymentMethod} />
                  {payment.paymentMethod}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
