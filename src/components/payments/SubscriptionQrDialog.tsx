"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getFriendlyErrorMessage } from '@/lib/friendly-errors';
import {
  Loader2,
  AlertTriangle,
  CheckCircle2,
  FlaskConical,
} from 'lucide-react';

interface SubscriptionQrDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName?: string;
  amount: number;
  planName: string;
  billingCycle?: 'monthly' | 'yearly';
  billingEndDate?: string;
}

type QrStep = 'loading' | 'qr' | 'success' | 'error';

function normalizeQrSrc(url: string): string {
  if (url.startsWith('data:')) return url;
  if (url.startsWith('http')) return url;
  return `data:image/png;base64,${url}`;
}

export function SubscriptionQrDialog({
  isOpen,
  onClose,
  clientId,
  clientName,
  amount,
  planName,
  billingCycle = 'monthly',
  billingEndDate,
}: SubscriptionQrDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<QrStep>('loading');
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [testUrl, setTestUrl] = useState<string | null>(null);
  const [showSimulator, setShowSimulator] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intentIdRef = useRef<string | null>(null);
  const pollingRef = useRef(false);

  const reset = useCallback(() => {
    setStep('loading');
    setQrImage(null);
    setTestUrl(null);
    setShowSimulator(false);
    setError(null);
    intentIdRef.current = null;
    pollingRef.current = false;
  }, []);

  const createQr = useCallback(async () => {
    setStep('loading');
    setError(null);
    try {
      const res = await fetch('/api/paymongo/qr/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          planName,
          billingCycle,
          details: { clientId, clientName, billingEndDate },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not generate QR code.');
      }
      intentIdRef.current = data.intentId;
      setQrImage(normalizeQrSrc(data.qrImageUrl));
      setTestUrl(data.testUrl ?? null);
      setStep('qr');
    } catch (err: unknown) {
      const message = getFriendlyErrorMessage(err, 'We couldn’t generate the payment QR. Please try again.');
      setError(message);
      setStep('error');
      toast({ variant: 'destructive', title: 'Payment error', description: message });
    }
  }, [amount, planName, billingCycle, clientId, clientName, billingEndDate, toast]);

  useEffect(() => {
    if (isOpen && amount > 0 && clientId) {
      reset();
      createQr();
    } else if (!isOpen) {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, amount, clientId]);

  const checkStatus = useCallback(async () => {
    const intentId = intentIdRef.current;
    if (!intentId || pollingRef.current) return;
    pollingRef.current = true;
    try {
      const res = await fetch('/api/paymongo/qr/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intentId, clientId }),
      });
      const data = await res.json();
      if (res.ok && data.paid && data.processed) {
        setStep('success');
      }
    } catch {
      // transient — keep polling
    } finally {
      pollingRef.current = false;
    }
  }, [clientId]);

  useEffect(() => {
    if (step !== 'qr') return;
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [step, checkStatus]);

  useEffect(() => {
    if (step !== 'success') return;
    toast({ title: 'Payment received', description: 'Your subscription has been updated.' });
    const timer = setTimeout(() => onClose(), 2500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scan to Pay</DialogTitle>
          <DialogDescription>
            {step === 'success'
              ? 'Payment confirmed.'
              : (
                <>
                  Paying <strong>₱{amount.toLocaleString()}</strong> for the{' '}
                  <strong>{planName}</strong>. Scan the QR Ph code with any bank or e-wallet app.
                </>
              )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 flex flex-col items-center justify-center gap-4 min-h-[280px]">
          {step === 'loading' && (
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <p className="mt-2 text-muted-foreground">Generating your payment QR…</p>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center text-destructive">
              <AlertTriangle className="h-12 w-12 mx-auto" />
              <p className="mt-2 font-semibold">Could not generate QR</p>
              <p className="text-xs mt-1">{error}</p>
              <Button className="mt-4" variant="outline" onClick={createQr}>
                Try again
              </Button>
            </div>
          )}

          {step === 'qr' && qrImage && (
            <>
              <div className="rounded-xl border bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrImage} alt="PayMongo QR Ph code" className="h-56 w-56 object-contain" />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Waiting for payment…
              </div>
              {testUrl && (
                <div className="w-full space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setShowSimulator((v) => !v)}
                  >
                    <FlaskConical className="h-4 w-4 mr-2" />
                    {showSimulator ? 'Hide test simulator' : 'Simulate payment (test mode)'}
                  </Button>
                  {showSimulator && (
                    <div className="w-full overflow-hidden rounded-lg border bg-white">
                      <iframe
                        src={testUrl}
                        title="PayMongo test payment simulator"
                        className="h-80 w-full"
                      />
                    </div>
                  )}
                </div>
              )}
              <p className="text-center text-xs text-muted-foreground">
                Keep this window open until payment is confirmed.
              </p>
            </>
          )}

          {step === 'success' && (
            <div className="text-center">
              <CheckCircle2 className="h-14 w-14 text-green-600 mx-auto" />
              <p className="mt-3 font-semibold text-lg">Payment received</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your {planName} is now active.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {step === 'success' ? 'Done' : 'Close'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
