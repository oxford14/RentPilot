
"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, ExternalLink } from 'lucide-react';
import type { Client } from '@/lib/types';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface PaymongoSubscriptionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  amount: number;
  planName: string;
}

export function PaymongoSubscriptionDialog({ isOpen, onClose, client, amount, planName }: PaymongoSubscriptionDialogProps) {
  const { toast } = useToast();
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && client && amount > 0 && planName) {
      createPaymongoLink();
    } else {
      setPaymentUrl(null);
      setIsLoading(false);
      setError(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, client, amount, planName]);

  const createPaymongoLink = async () => {
    if (!client) return;
    setIsLoading(true);
    setError(null);
    setPaymentUrl(null);
    
    try {
      const response = await fetch('/api/paymongo/create-source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount: amount,
          paymentType: 'subscription',
          details: {
            clientId: client.id,
            clientName: client.name,
            planName: planName,
          }
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to create payment link.');
      }

      setPaymentUrl(responseData.paymentUrl);
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Payment Error",
        description: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProceed = () => {
    if (paymentUrl) {
      window.open(paymentUrl, '_blank');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pay {planName} Subscription</DialogTitle>
          <DialogDescription>
            You are about to pay <strong>₱{amount.toFixed(2)}</strong> for your subscription. You will be redirected to PayMongo's secure payment page.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 flex items-center justify-center min-h-[150px]">
          {isLoading && (
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <p className="mt-2 text-muted-foreground">Generating payment link...</p>
            </div>
          )}
          {error && (
             <div className="text-center text-destructive">
              <AlertTriangle className="h-12 w-12 mx-auto" />
              <p className="mt-2 font-semibold">Could not create payment link</p>
              <p className="text-xs mt-1">{error}</p>
            </div>
          )}
          {paymentUrl && (
            <div className="text-center space-y-4">
               <Alert>
                <AlertTriangle className="h-4 w-4"/>
                <AlertTitle>Ready to Pay?</AlertTitle>
                <AlertDescription>
                  Click the button below to open the secure payment page in a new tab.
                </AlertDescription>
              </Alert>
              <Button onClick={handleProceed} className="w-full">
                 <ExternalLink className="mr-2 h-4 w-4"/>
                 Proceed to Payment
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
