
"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getFriendlyErrorMessage } from '@/lib/friendly-errors';
import { Loader2, AlertTriangle, ExternalLink } from 'lucide-react';
import type { Tenant } from '@/lib/types';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface PaymongoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant | null;
  amount: number;
}

export function PaymongoDialog({ isOpen, onClose, tenant, amount }: PaymongoDialogProps) {
  const { toast } = useToast();
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && tenant && amount > 0) {
      createPaymongoLink();
    } else {
      setCheckoutUrl(null);
      setIsLoading(false);
      setError(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, tenant, amount]);

  const createPaymongoLink = async () => {
    if (!tenant) return;
    setIsLoading(true);
    setError(null);
    setCheckoutUrl(null);
    
    try {
      const response = await fetch('/api/paymongo/create-source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amount,
          paymentType: 'rent',
          details: {
            tenantId: tenant.id,
            tenantName: tenant.name,
            clientId: tenant.clientId
          }
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to create payment link.');
      }

      setCheckoutUrl(responseData.checkoutUrl);
    } catch (err: any) {
      const message = getFriendlyErrorMessage(err, 'We couldn’t create the payment link. Please try again.');
      setError(message);
      toast({
        variant: "destructive",
        title: "Payment error",
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProceed = () => {
    if (checkoutUrl) {
      window.open(checkoutUrl, '_blank');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete Your Payment</DialogTitle>
          <DialogDescription>
            You are paying <strong>₱{amount.toFixed(2)}</strong>. You will be redirected to a secure PayMongo page to complete the transaction.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 flex items-center justify-center min-h-[150px]">
          {isLoading && (
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <p className="mt-2 text-muted-foreground">Generating Payment Link...</p>
            </div>
          )}
          {error && (
             <div className="text-center text-destructive">
              <AlertTriangle className="h-12 w-12 mx-auto" />
              <p className="mt-2 font-semibold">Could not create Payment Link</p>
              <p className="text-xs mt-1">{error}</p>
            </div>
          )}
          {checkoutUrl && (
            <div className="text-center space-y-4">
               <Alert>
                <ExternalLink className="h-4 w-4"/>
                <AlertTitle>Ready to Pay?</AlertTitle>
                <AlertDescription>
                  Click the button below to proceed to the secure payment page.
                </AlertDescription>
              </Alert>
              <Button onClick={handleProceed} size="lg">
                Proceed to Secure Payment
              </Button>
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
