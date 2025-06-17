
"use client";

import React from 'react';
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
import { CreditCard, Landmark, DollarSign, HelpCircle } from 'lucide-react';

const PaymentMethodIcon = ({ method }: { method: string }) => {
  switch (method) {
    case 'Credit Card': return <CreditCard className="h-4 w-4 text-blue-500" />;
    case 'Bank Transfer': return <Landmark className="h-4 w-4 text-green-500" />;
    case 'Cash': return <DollarSign className="h-4 w-4 text-yellow-500" />;
    default: return <HelpCircle className="h-4 w-4 text-gray-500" />;
  }
};

export function PaymentsTable() {
  const { payments, tenants } = useAppContext();

  const getTenantName = (tenantId: string): string => {
    const tenant = tenants.find(t => t.id === tenantId);
    return tenant ? tenant.name : 'Unknown Tenant';
  };

  const sortedPayments = [...payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (!sortedPayments || sortedPayments.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No payments recorded yet. Add a payment to see it here.</p>;
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
          {sortedPayments.map((payment) => (
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
