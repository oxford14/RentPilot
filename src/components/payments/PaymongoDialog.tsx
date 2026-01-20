
"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, CheckCircle2, QrCode } from 'lucide-react';
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
      createPaymongoQrCode();
    } else {
      setQrCodeUrl(null);
      setIsLoading(false);
      setError(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, tenant, amount]);

  const createPaymongoQrCode = async () => {
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
        throw new Error(responseData.error || 'Failed to create QR code.');
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
          <DialogTitle className="flex items-center gap-2"><QrCode/>Pay with QR Ph</DialogTitle>
          <DialogDescription>
            You are about to pay a due of <strong>₱{amount.toFixed(2)}</strong>. Scan the QR code below using your mobile banking or e-wallet app.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 flex items-center justify-center min-h-[300px]">
          {isLoading && (
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <p className="mt-2 text-muted-foreground">Generating QR code...</p>
            </div>
          )}
          {error && (
             <div className="text-center text-destructive">
              <AlertTriangle className="h-12 w-12 mx-auto" />
              <p className="mt-2 font-semibold">Could not generate QR code</p>
              <p className="text-xs mt-1">{error}</p>
            </div>
          )}
          {qrCodeUrl && (
            <div className="text-center space-y-4">
              <div className="bg-white p-4 rounded-lg border shadow-md">
                 <Image src={qrCodeUrl} alt="QR Code for Payment" width={250} height={250} />
              </div>
              <p className="font-semibold text-lg">Scan to Pay</p>
               <div className="p-3 bg-blue-500/10 text-blue-700 border-l-4 border-blue-500 rounded-r-md text-left text-sm">
                 <p className="text-xs">Once payment is complete, your records will be updated automatically. You may close this window after paying.</p>
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
