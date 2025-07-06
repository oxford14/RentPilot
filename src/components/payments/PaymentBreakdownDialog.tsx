"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { PaymentAllocation } from '@/lib/types';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Banknote, ListChecks } from 'lucide-react';

interface PaymentBreakdownDialogProps {
  isOpen: boolean;
  onClose: () => void;
  allocation: PaymentAllocation | null;
}

const formatCurrency = (amount: number) => `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function PaymentBreakdownDialog({ isOpen, onClose, allocation }: PaymentBreakdownDialogProps) {
  if (!isOpen || !allocation) {
    return null;
  }

  const { payment, paidRent, paidDues, unallocatedAmount } = allocation;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Payment Breakdown</DialogTitle>
          <DialogDescription>
            This shows how the payment of {formatCurrency(payment.amount)} on {format(new Date(payment.date), 'PP')} was allocated.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] -mx-6 px-6">
          <div className="space-y-4 py-4">
            {paidRent.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 text-sm flex items-center gap-2"><Banknote className="h-4 w-4 text-primary"/>Rent Paid</h4>
                <div className="space-y-2 text-sm">
                  {paidRent.map((rent, index) => (
                    <div key={`rent-${index}`} className="flex justify-between items-center p-2 bg-muted rounded-md">
                      <span>Rent for {rent.month}</span>
                      <span className="font-medium">{formatCurrency(rent.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {paidDues.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 text-sm flex items-center gap-2"><ListChecks className="h-4 w-4 text-primary"/>Additional Dues Paid</h4>
                <div className="space-y-2 text-sm">
                  {paidDues.map((dueItem, index) => (
                    <div key={`due-${index}`} className="flex justify-between items-center p-2 bg-muted rounded-md">
                      <div>
                        <p>{dueItem.due.type}</p>
                        <p className="text-xs text-muted-foreground">Due: {format(new Date(dueItem.due.dueDate), 'PP')}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(dueItem.amountPaid)}</p>
                        {dueItem.status === 'Partially Paid' && (
                          <Badge variant="outline" className="text-xs mt-1">Partially Paid</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {(paidRent.length > 0 || paidDues.length > 0) && (
                 <Separator className="my-4" />
            )}

            <div className="flex justify-between items-center text-sm font-semibold p-2">
              <span>Total Allocated:</span>
              <span>{formatCurrency(payment.amount - unallocatedAmount)}</span>
            </div>

            {unallocatedAmount > 0 && (
              <div className="flex justify-between items-center text-sm font-semibold p-2 text-green-600">
                <span>Created Credit / Overpayment:</span>
                <span>{formatCurrency(unallocatedAmount)}</span>
              </div>
            )}
            
            {paidRent.length === 0 && paidDues.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                    <p>This payment did not cover any outstanding charges and was recorded as a credit.</p>
                </div>
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
