"use client";

import React, { useCallback, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getFriendlyErrorMessage } from '@/lib/friendly-errors';
import { cn } from '@/lib/utils';
import { CreditCard, Wallet, QrCode, Loader2, ShieldCheck } from 'lucide-react';
import {
  serverStartAutoRenew,
  serverConfirmAutoRenew,
  serverSetAutoRenewPaymentIntent,
  serverEnableGcashAssisted,
} from '@/actions/subscription-actions';

const PAYMONGO_API = 'https://api.paymongo.com/v1';

type Method = 'card' | 'paymaya' | 'gcash';

interface AutoRenewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  adminEmail: string;
  planLabel: string;
  pendingStorageKey: string;
  onBusyChange?: (busy: boolean) => void;
  onEnabled: (methodLabel: string) => void;
}

function paymongoErr(data: { errors?: Array<{ detail?: string }> }, fallback: string): string {
  return data?.errors?.map((e) => e.detail).filter(Boolean).join(', ') || fallback;
}

export function AutoRenewDialog({
  isOpen,
  onClose,
  clientId,
  adminEmail,
  planLabel,
  pendingStorageKey,
  onBusyChange,
  onEnabled,
}: AutoRenewDialogProps) {
  const { toast } = useToast();
  const [method, setMethod] = useState<Method>('card');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardName, setCardName] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMethod('card');
      setError(null);
      setCardNumber('');
      setExpiry('');
      setCvc('');
      setCardName('');
    }
  }, [isOpen]);

  const setWorking = useCallback(
    (value: boolean) => {
      setBusy(value);
      onBusyChange?.(value);
    },
    [onBusyChange]
  );

  const createPaymentMethod = useCallback(
    async (publicKey: string): Promise<{ id: string; label: string }> => {
      const authHeader = `Basic ${btoa(`${publicKey}:`)}`;
      const attributes: Record<string, unknown> = {
        type: method,
        billing: { name: cardName || 'RentPilot Client', email: adminEmail },
      };

      if (method === 'card') {
        const digits = cardNumber.replace(/\s+/g, '');
        const [mm, yy] = expiry.split('/').map((s) => s.trim());
        if (!digits || !mm || !yy || !cvc) {
          throw new Error('Please fill in all card details.');
        }
        attributes.details = {
          card_number: digits,
          exp_month: Number(mm),
          exp_year: Number(yy.length === 2 ? `20${yy}` : yy),
          cvc,
        };
      }

      const res = await fetch(`${PAYMONGO_API}/payment_methods`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          authorization: authHeader,
        },
        body: JSON.stringify({ data: { attributes } }),
      });
      const data = await res.json();
      if (!res.ok || data.errors) {
        throw new Error(paymongoErr(data, 'Could not save the payment method.'));
      }

      const attrs = data.data?.attributes ?? {};
      let label = method === 'paymaya' ? 'Maya' : 'Card';
      if (method === 'card') {
        const details = attrs.details ?? {};
        const brand = String(details.brand ?? 'Card');
        const last4 = String(details.last4 ?? cardNumber.replace(/\s+/g, '').slice(-4));
        label = `${brand.charAt(0).toUpperCase()}${brand.slice(1)} ...${last4}`;
      }
      return { id: data.data.id as string, label };
    },
    [method, cardNumber, expiry, cvc, cardName, adminEmail]
  );

  const attachPaymentMethod = useCallback(
    async (params: {
      publicKey: string;
      paymentIntentId: string;
      clientKey: string;
      paymentMethodId: string;
    }): Promise<{ status: string; redirectUrl?: string }> => {
      const authHeader = `Basic ${btoa(`${params.publicKey}:`)}`;
      const returnUrl = `${window.location.origin}/subscription?autorenew=success`;
      const res = await fetch(
        `${PAYMONGO_API}/payment_intents/${params.paymentIntentId}/attach`,
        {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
            authorization: authHeader,
          },
          body: JSON.stringify({
            data: {
              attributes: {
                payment_method: params.paymentMethodId,
                client_key: params.clientKey,
                return_url: returnUrl,
              },
            },
          }),
        }
      );
      const data = await res.json();
      if (!res.ok || data.errors) {
        throw new Error(paymongoErr(data, 'Could not confirm the payment.'));
      }
      const attrs = data.data?.attributes ?? {};
      return {
        status: String(attrs.status ?? 'unknown'),
        redirectUrl: attrs.next_action?.redirect?.url,
      };
    },
    []
  );

  const handleCardOrMaya = useCallback(async () => {
    setError(null);
    setWorking(true);
    try {
      const start = await serverStartAutoRenew({
        clientId,
        method: method as 'card' | 'paymaya',
        adminEmail,
      });

      const pm = await createPaymentMethod(start.publicKey);
      await serverSetAutoRenewPaymentIntent({
        clientId,
        paymentIntentId: start.paymentIntentId,
      });

      const attach = await attachPaymentMethod({
        publicKey: start.publicKey,
        paymentIntentId: start.paymentIntentId,
        clientKey: start.clientKey,
        paymentMethodId: pm.id,
      });

      if (attach.status === 'awaiting_next_action' && attach.redirectUrl) {
        sessionStorage.setItem(
          pendingStorageKey,
          JSON.stringify({ method, label: pm.label })
        );
        window.location.href = attach.redirectUrl;
        return;
      }

      if (attach.status === 'succeeded' || attach.status === 'processing') {
        const res = await serverConfirmAutoRenew({
          clientId,
          method: method as 'card' | 'paymaya',
          fallbackLabel: pm.label,
        });
        onEnabled(res.methodLabel);
        return;
      }

      throw new Error(`Payment could not be completed (status: ${attach.status}).`);
    } catch (err: unknown) {
      const message = getFriendlyErrorMessage(err, 'Could not enable auto-renew.');
      setError(message);
      toast({ variant: 'destructive', title: 'Auto-renew failed', description: message });
    } finally {
      setWorking(false);
    }
  }, [
    clientId,
    method,
    adminEmail,
    createPaymentMethod,
    attachPaymentMethod,
    pendingStorageKey,
    onEnabled,
    setWorking,
    toast,
  ]);

  const handleGcash = useCallback(async () => {
    setError(null);
    setWorking(true);
    try {
      await serverEnableGcashAssisted({ clientId });
      onEnabled('GCash');
    } catch (err: unknown) {
      const message = getFriendlyErrorMessage(err, 'Could not enable GCash auto-renew.');
      setError(message);
      toast({ variant: 'destructive', title: 'Auto-renew failed', description: message });
    } finally {
      setWorking(false);
    }
  }, [clientId, onEnabled, setWorking, toast]);

  const submit = method === 'gcash' ? handleGcash : handleCardOrMaya;

  const methodOptions: Array<{ key: Method; label: string; icon: React.ElementType; hint: string }> = [
    { key: 'card', label: 'Card', icon: CreditCard, hint: 'Auto-charged each month' },
    { key: 'paymaya', label: 'Maya', icon: Wallet, hint: 'Auto-charged each month' },
    { key: 'gcash', label: 'GCash', icon: QrCode, hint: 'Assisted: QR + email near due date' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set up auto-renew</DialogTitle>
          <DialogDescription>
            Keep your {planLabel} active automatically. Choose how you&apos;d like to pay each month.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2">
          {methodOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              disabled={busy}
              onClick={() => setMethod(opt.key)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-colors',
                method === opt.key
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                  : 'hover:bg-muted/50'
              )}
            >
              <opt.icon className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">{opt.label}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground -mt-1">
          {methodOptions.find((o) => o.key === method)?.hint}
        </p>

        {method === 'card' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ar-card-name">Name on card</Label>
              <Input
                id="ar-card-name"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder="Juan Dela Cruz"
                disabled={busy}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ar-card-number">Card number</Label>
              <Input
                id="ar-card-number"
                inputMode="numeric"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="4343 4343 4343 4345"
                disabled={busy}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ar-card-exp">Expiry (MM/YY)</Label>
                <Input
                  id="ar-card-exp"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  placeholder="12/28"
                  disabled={busy}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ar-card-cvc">CVC</Label>
                <Input
                  id="ar-card-cvc"
                  inputMode="numeric"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value)}
                  placeholder="123"
                  disabled={busy}
                />
              </div>
            </div>
          </div>
        )}

        {method === 'paymaya' && (
          <p className="text-sm text-muted-foreground">
            You&apos;ll be redirected to Maya to authorize automatic monthly payments, then brought
            back here.
          </p>
        )}

        {method === 'gcash' && (
          <p className="text-sm text-muted-foreground">
            GCash can&apos;t be charged automatically. Near your due date we&apos;ll auto-generate a
            renewal QR and email you a one-tap pay link so renewing takes seconds.
          </p>
        )}

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          Card details are sent directly to PayMongo and never touch our servers.
        </p>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {method === 'gcash' ? 'Enable GCash assist' : 'Save & enable'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
