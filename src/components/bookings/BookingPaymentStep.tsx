"use client";

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import type { PaymentMethod } from '@/lib/types';
import { Loader2 } from 'lucide-react';

const POS_METHODS: PaymentMethod[] = ['Cash', 'Gcash', 'PayMaya', 'Credit Card', 'Bank Transfer', 'Other'];

interface BookingPaymentStepProps {
  totalAmount: number;
  isAdvanceBooking: boolean;
  downPayment?: number;
  onDownPaymentChange?: (value: number | undefined) => void;
  onConfirm: (payment: {
    amount: number;
    paymentMethod: PaymentMethod;
    discountApplied?: number;
    discountDescription?: string;
  }) => Promise<void>;
  onBack: () => void;
}

export function BookingPaymentStep({
  totalAmount,
  isAdvanceBooking,
  downPayment,
  onDownPaymentChange,
  onConfirm,
  onBack,
}: BookingPaymentStepProps) {
  const { user } = useAuth();
  const canApplyDiscount = user?.isSuperAdmin || user?.role === 'admin' || user?.canApplyDiscount;

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [amountPaid, setAmountPaid] = useState<number | ''>('');
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountApplied, setDiscountApplied] = useState<number | ''>('');
  const [discountDescription, setDiscountDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const discountValue = typeof discountApplied === 'number' ? discountApplied : 0;
  const amountDue = useMemo(() => {
    if (isAdvanceBooking) {
      return typeof downPayment === 'number' ? downPayment : 0;
    }
    return Math.max(0, totalAmount - discountValue);
  }, [isAdvanceBooking, downPayment, totalAmount, discountValue]);

  const effectivePaid = typeof amountPaid === 'number' ? amountPaid : amountDue;
  const balanceAfter = Math.max(0, totalAmount - discountValue - effectivePaid);

  React.useEffect(() => {
    if (isAdvanceBooking) {
      setAmountPaid(typeof downPayment === 'number' ? downPayment : '');
    } else {
      setAmountPaid(Math.max(0, totalAmount - discountValue));
    }
  }, [isAdvanceBooking, downPayment, totalAmount, discountValue]);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm({
        amount: effectivePaid,
        paymentMethod,
        discountApplied: !isAdvanceBooking && discountValue > 0 ? discountValue : undefined,
        discountDescription: discountDescription || undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Rental total</span>
          <span className="font-semibold">₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        {!isAdvanceBooking && discountValue > 0 && (
          <div className="flex justify-between text-green-700">
            <span>Discount</span>
            <span>-₱{discountValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        )}
        <Separator />
        <div className="flex justify-between font-medium">
          <span>{isAdvanceBooking ? 'Down payment due now' : 'Amount due now'}</span>
          <span className="text-primary">₱{amountDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        {!isAdvanceBooking && balanceAfter > 0 && effectivePaid < amountDue && (
          <div className="flex justify-between text-destructive">
            <span>Remaining balance</span>
            <span>₱{balanceAfter.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        )}
      </div>

      {isAdvanceBooking && onDownPaymentChange && (
        <div className="space-y-2">
          <Label htmlFor="down-payment">Down payment (optional)</Label>
          <Input
            id="down-payment"
            type="number"
            min={0}
            max={totalAmount}
            placeholder="Leave empty for no advance payment"
            value={downPayment ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              onDownPaymentChange(val === '' ? undefined : Number(val));
            }}
            className="h-11"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>Payment method</Label>
        <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
          <SelectTrigger className="h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {POS_METHODS.map((method) => (
              <SelectItem key={method} value={method}>
                {method}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!isAdvanceBooking && (
        <div className="space-y-2">
          <Label htmlFor="amount-paid">Amount paid</Label>
          <Input
            id="amount-paid"
            type="number"
            min={0}
            value={amountPaid}
            onChange={(e) => setAmountPaid(e.target.value === '' ? '' : Number(e.target.value))}
            className="h-11"
          />
        </div>
      )}

      {canApplyDiscount && !isAdvanceBooking && (
        <div className="space-y-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowDiscount(!showDiscount)}>
            {showDiscount ? 'Hide discount' : 'Apply discount'}
          </Button>
          {showDiscount && (
            <div className="space-y-2 rounded-lg border p-3">
              <Input
                type="number"
                min={0}
                max={totalAmount}
                placeholder="Discount amount (₱)"
                value={discountApplied}
                onChange={(e) => setDiscountApplied(e.target.value === '' ? '' : Number(e.target.value))}
                className="h-11"
              />
              <Input
                placeholder="Discount reason"
                value={discountDescription}
                onChange={(e) => setDiscountDescription(e.target.value)}
                className="h-11"
              />
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-2 sticky bottom-0 bg-background pb-1">
        <Button type="button" variant="outline" className="flex-1 h-11" onClick={onBack}>
          Back
        </Button>
        <Button
          type="button"
          className="flex-1 h-11"
          disabled={isSubmitting || (amountDue > 0 && effectivePaid <= 0 && !isAdvanceBooking)}
          onClick={handleConfirm}
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Booking'}
        </Button>
      </div>
    </div>
  );
}
