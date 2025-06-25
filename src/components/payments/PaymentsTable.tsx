

"use client";

import React, { useMemo, useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Payment, Tenant, PaymentMethod } from '@/lib/types';
import { useAppContext } from '@/contexts/AppContext';
import { CreditCard, Landmark, DollarSign, HelpCircle, Search, ListX, PercentCircle, MinusCircle, Wallet, MoreHorizontal, Edit, Trash2, Send, BadgeDollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isTenantCurrentlyDueForRent } from '@/lib/utils';
import { startOfDay } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const PaymentMethodIcon = ({ method }: { method?: PaymentMethod }) => {
  if (!method) return <MinusCircle className="h-4 w-4 text-muted-foreground" />;
  switch (method) {
    case 'Credit Card': return <CreditCard className="h-4 w-4 text-primary" />;
    case 'Bank Transfer': return <Landmark className="h-4 w-4 text-green-500" />;
    case 'Cash': return <DollarSign className="h-4 w-4 text-yellow-600" />;
    case 'Gcash': return <Wallet className="h-4 w-4 text-blue-500" />;
    case 'From Deposit': return <Send className="h-4 w-4 text-purple-500" />;
    case 'From Credit': return <BadgeDollarSign className="h-4 w-4 text-cyan-500" />;
    default: return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
  }
};

interface PaymentsTableProps {
  tenantId?: string | null;
  onEdit: (payment: Payment) => void;
  onDelete: (payment: Payment) => void;
}

export function PaymentsTable({ tenantId, onEdit, onDelete }: PaymentsTableProps) {
  const { payments: allPaymentsFromContext, tenants: allTenantsFromContext, additionalDues } = useAppContext();
  const [clientToday, setClientToday] = useState<Date | null>(null);

  useEffect(() => {
    setClientToday(startOfDay(new Date()));
  }, []);

  const getTenantName = (id: string): string => {
    const tenant = allTenantsFromContext.find(t => t.id === id);
    return tenant ? tenant.name : 'Unknown Tenant';
  };
  
  const tenantForHeader = tenantId ? getTenantName(tenantId) : '';

  const filteredAndSortedPayments = useMemo(() => {
    if (!tenantId) {
      return [];
    }
    return [...allPaymentsFromContext]
      .filter(payment => payment.tenantId === tenantId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allPaymentsFromContext, tenantId]);

  const isSelectedTenantCurrentlyDue = useMemo(() => {
    if (!tenantId || !clientToday) return false;
    const selectedTenant = allTenantsFromContext.find(t => t.id === tenantId);
    if (!selectedTenant) return false;
    return isTenantCurrentlyDueForRent(selectedTenant, allPaymentsFromContext, additionalDues, clientToday);
  }, [tenantId, clientToday, allTenantsFromContext, allPaymentsFromContext, additionalDues]);


  if (!tenantId) {
    return (
      <div className="text-center text-muted-foreground py-8 flex flex-col items-center justify-center h-full">
        <Search className="mx-auto h-12 w-12 mb-3 text-gray-400" />
        <p className="text-lg">Select a Tenant</p>
        <p className="text-sm">Choose a tenant from the list to view their payment history.</p>
      </div>
    );
  }
  
  if (!filteredAndSortedPayments || filteredAndSortedPayments.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8 flex flex-col items-center justify-center h-full">
        <ListX className="mx-auto h-12 w-12 mb-3 text-gray-400" />
        <p className="text-lg">No Payments Found</p>
        <p className="text-sm">There are no payments recorded for {tenantForHeader || 'this tenant'}.</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="rounded-lg border shadow-sm overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Amount Paid (₱)</TableHead>
              <TableHead className="text-right">Discount (₱)</TableHead>
              <TableHead className="text-center">Method</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedPayments.map((payment) => (
              <TableRow 
                key={payment.id} 
                className={cn(
                  "hover:bg-muted/50 transition-colors",
                  { 'bg-destructive/10 hover:bg-destructive/20': isSelectedTenantCurrentlyDue }
                )}
              >
                <TableCell>{new Date(payment.date).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">{payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                <TableCell className="text-right">
                  {(payment.discountApplied && payment.discountApplied > 0) ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                            <Badge variant="outline" className="text-xs border-orange-400 text-orange-600 bg-orange-500/10 cursor-default">
                                <PercentCircle className="h-3 w-3 mr-1" />
                                {payment.discountApplied.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </Badge>
                        </TooltipTrigger>
                        {payment.discountDescription && (
                            <TooltipContent>
                                <p>{payment.discountDescription}</p>
                            </TooltipContent>
                        )}
                      </Tooltip>
                  ) : '₱0.00'}
                </TableCell>
                <TableCell className="text-center">
                   <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="outline" className="flex items-center justify-center gap-1 py-1 px-2 text-xs">
                          <PaymentMethodIcon method={payment.paymentMethod} />
                          {payment.paymentMethod || 'N/A'}
                        </Badge>
                      </TooltipTrigger>
                       {payment.discountDescription?.startsWith('Auto-paid from credit') && (
                          <TooltipContent>
                            <p>{payment.discountDescription}</p>
                          </TooltipContent>
                        )}
                   </Tooltip>
                </TableCell>
                <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0" disabled={payment.paymentMethod === 'From Deposit' || payment.paymentMethod === 'From Credit'}>
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(payment)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(payment)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
