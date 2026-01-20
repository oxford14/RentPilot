
"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react';
import type { Client } from '@/lib/types';

interface PaymongoSubscriptionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  amount: number;
  planName: string;
}

export function PaymongoSubscriptionDialog({ isOpen, onClose, client, amount, planName }: PaymongoSubscriptionDialogProps) {
  const { toast } = useToast();
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && client && amount > 0 && planName) {
      createPaymongoLink();
    } else {
      setCheckoutUrl(null);
      setIsLoading(false);
      setError(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, client, amount, planName]);

  const createPaymongoLink = async () => {
    if (!client) return;
    setIsLoading(true);
    setError(null);
    setCheckoutUrl(null);
    
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

      setCheckoutUrl(responseData.checkoutUrl);
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pay {planName} Subscription</DialogTitle>
          <DialogDescription>
            You are about to pay <strong>₱{amount.toFixed(2)}</strong> for your subscription. Click below to proceed to a secure payment page.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 flex items-center justify-center min-h-[250px]">
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
          {checkoutUrl && (
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
              <p className="font-semibold">Your secure payment link is ready.</p>
              <Button asChild size="lg">
                <a href={checkoutUrl} target="_blank" rel="noopener noreferrer" onClick={onClose}>
                  Proceed to Payment <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
               <div className="p-3 bg-blue-500/10 text-blue-700 border-l-4 border-blue-500 rounded-r-md text-left text-sm">
                 <p className="text-xs">You will be redirected to PayMongo's secure website. You can choose QR Ph or other available methods there.</p>
               </div>
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
