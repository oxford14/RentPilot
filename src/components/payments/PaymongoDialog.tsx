
"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { Tenant } from '@/lib/types';

interface PaymongoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant | null;
  amount: number;
}

export function PaymongoDialog({ isOpen, onClose, tenant, amount }: PaymongoDialogProps) {
  const { toast } = useToast();
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && tenant && amount > 0) {
      createPaymongoQr();
    } else {
      setQrCodeUrl(null);
      setIsLoading(false);
      setError(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, tenant, amount]);

  const createPaymongoQr = async () => {
    if (!tenant) return;
    setIsLoading(true);
    setError(null);
    setQrCodeUrl(null);
    
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
        throw new Error(responseData.error || 'Failed to create QR Code.');
      }

      setQrCodeUrl(responseData.qrCodeUrl);
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
          <DialogTitle>Pay with QR Ph</DialogTitle>
          <DialogDescription>
            Scan the QR code below to pay your due of <strong>₱{amount.toFixed(2)}</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 flex items-center justify-center min-h-[250px]">
          {isLoading && (
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <p className="mt-2 text-muted-foreground">Generating QR Code...</p>
            </div>
          )}
          {error && (
             <div className="text-center text-destructive">
              <AlertTriangle className="h-12 w-12 mx-auto" />
              <p className="mt-2 font-semibold">Could not generate QR</p>
              <p className="text-xs mt-1">{error}</p>
            </div>
          )}
          {qrCodeUrl && (
            <div className="text-center space-y-4">
              <div className="p-4 bg-white rounded-lg inline-block shadow-md">
                <Image src={qrCodeUrl} alt="Payment QR Code" width={200} height={200} />
              </div>
              <div className="p-3 bg-green-500/10 text-green-700 border-l-4 border-green-500 rounded-r-md text-left text-sm">
                <div className="flex items-start">
                  <CheckCircle2 className="h-5 w-5 mr-2 mt-0.5" />
                  <div>
                    <p className="font-semibold">Payment will be automatically recorded.</p>
                    <p className="text-xs">Once your payment is confirmed, your balance will be updated. You can close this window after paying.</p>
                  </div>
                </div>
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
