
"use client";

import React, { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  CalendarDays,
  Check,
  Loader2,
  Sparkles,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getFriendlyErrorMessage } from '@/lib/friendly-errors';
import {
  SUBSCRIPTION_PLANS,
  getSubscriptionActions,
  getPlanRate,
  formatPlanRate,
  normalizePlanKey,
  planDisplayLabel,
  type PlanKey,
  type BillingCycle,
} from '@/lib/subscription-plans';
import {
  canRenewSubscription,
  getClientSubscriptionStatus,
  RENEWAL_WINDOW_DAYS,
} from '@/lib/subscription-status';
import { SubscriptionQrDialog } from '@/components/payments/SubscriptionQrDialog';
import { AutoRenewDialog } from '@/components/payments/AutoRenewDialog';
import { Switch } from '@/components/ui/switch';
import { serverConfirmAutoRenew, serverDisableAutoRenew } from '@/actions/subscription-actions';
import { RotateCw, CreditCard, ShieldOff, Mail } from 'lucide-react';

const SUPPORT_EMAIL = 'support@rentalpilot.app';

const PENDING_SUBSCRIPTION_KEY = 'paymongo_pending_subscription';
const AUTORENEW_PENDING_KEY = 'paymongo_pending_autorenew';

function PlanCard({
  planKey,
  title,
  price,
  description,
  features,
  isCurrentPlan = false,
  actionLabel,
  onAction,
  contactHref,
  priceSubtext,
  disabled = false,
}: {
  planKey: PlanKey;
  title: string;
  price: string;
  description: string;
  features: string[];
  isCurrentPlan?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  contactHref?: string;
  priceSubtext?: string;
  disabled?: boolean;
}) {
  return (
    <Card
      className={cn(
        'flex flex-col h-full transition-shadow hover:shadow-md',
        isCurrentPlan && 'border-primary ring-2 ring-primary/30 shadow-lg'
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg">{title}</CardTitle>
          {isCurrentPlan && (
            <Badge variant="secondary" className="shrink-0">
              Current
            </Badge>
          )}
        </div>
        <CardDescription className="text-2xl font-bold text-foreground pt-1">{price}</CardDescription>
        {priceSubtext && (
          <p className="text-xs text-muted-foreground">{priceSubtext}</p>
        )}
      </CardHeader>
      <CardContent className="flex-1">
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
        <ul className="space-y-2 text-sm">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="pt-0">
        {contactHref ? (
          <Button asChild className="w-full" variant="outline">
            <a href={contactHref}>
              <Mail className="mr-2 h-4 w-4" />
              {actionLabel ?? 'Contact Sales'}
            </a>
          </Button>
        ) : onAction && actionLabel ? (
          <Button onClick={onAction} className="w-full" disabled={disabled} variant={isCurrentPlan ? 'secondary' : 'default'}>
            {actionLabel}
          </Button>
        ) : isCurrentPlan ? (
          <Button className="w-full" variant="outline" disabled>
            Your plan
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}

function SubscriptionPageContent() {
  const { user, isLoading: authIsLoading } = useAuth();
  const { clients } = useAppContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [isActivating, setIsActivating] = useState(false);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [qrCheckout, setQrCheckout] = useState<{
    amount: number;
    planName: string;
    billingCycle: BillingCycle;
    billingEndDate?: string;
  } | null>(null);
  const [autoRenewOpen, setAutoRenewOpen] = useState(false);
  const [autoRenewBusy, setAutoRenewBusy] = useState(false);

  const client = useMemo(() => {
    if (!user || !user.clientId) return null;
    return clients.find((c) => c.id === user.clientId);
  }, [user, clients]);

  useEffect(() => {
    if (!authIsLoading && (!user || user.isSuperAdmin || user.role === 'tenant')) {
      router.push('/');
    }
  }, [user, authIsLoading, router]);

  const activateSubscription = useCallback(
    async (params: { sessionId?: string; paymentRef?: string }) => {
      if (!client) return;

      const maxAttempts = 8;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const response = await fetch('/api/paymongo/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: params.sessionId,
            paymentRef: params.paymentRef,
            clientId: client.id,
          }),
        });
        const data = await response.json();

        if (response.ok && (data.processed || data.duplicate || data.alreadyActivated)) {
          sessionStorage.removeItem(PENDING_SUBSCRIPTION_KEY);
          router.replace('/subscription');
          toast({
            title:
              data.alreadyActivated || data.duplicate
                ? 'Payment received'
                : 'Subscription activated',
            description: 'Your plan is extended one month from your previous due date.',
          });
          return;
        }

        const stillProcessing =
          response.status === 400 &&
          typeof data.error === 'string' &&
          data.error.toLowerCase().includes('processing');

        if (!stillProcessing) {
          throw new Error(data.error || 'Could not activate subscription.');
        }

        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      throw new Error('Payment is taking longer than expected. Please refresh the page in a moment.');
    },
    [client, router, toast]
  );

  useEffect(() => {
    if (!client) return;

    const payment = searchParams.get('payment');
    if (payment === 'cancelled') {
      sessionStorage.removeItem(PENDING_SUBSCRIPTION_KEY);
      router.replace('/subscription');
      toast({ title: 'Payment cancelled', description: 'No changes were made to your subscription.' });
      return;
    }

    if (payment !== 'success') return;

    let paymentRef = searchParams.get('ref');
    let sessionId = searchParams.get('session_id');

    try {
      const raw = sessionStorage.getItem(PENDING_SUBSCRIPTION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { sessionId?: string; paymentRef?: string };
        sessionId = sessionId ?? parsed.sessionId ?? null;
        paymentRef = paymentRef ?? parsed.paymentRef ?? null;
      }
    } catch {
      sessionStorage.removeItem(PENDING_SUBSCRIPTION_KEY);
    }

    setIsActivating(true);
    activateSubscription({
      sessionId: sessionId ?? undefined,
      paymentRef: paymentRef ?? undefined,
    })
      .catch((err: unknown) => {
        const message = getFriendlyErrorMessage(err, 'Could not activate subscription.');
        toast({ variant: 'destructive', title: 'Activation failed', description: message });
        router.replace('/subscription');
      })
      .finally(() => setIsActivating(false));
  }, [client, searchParams, router, toast, activateSubscription]);

  // Handle return from a 3DS / Maya redirect during auto-renew setup.
  useEffect(() => {
    if (!client) return;
    const autorenew = searchParams.get('autorenew');
    if (!autorenew) return;

    let pending: { method?: 'card' | 'paymaya'; label?: string } = {};
    try {
      const raw = sessionStorage.getItem(AUTORENEW_PENDING_KEY);
      if (raw) pending = JSON.parse(raw);
    } catch {
      // ignore
    }
    sessionStorage.removeItem(AUTORENEW_PENDING_KEY);
    router.replace('/subscription');

    if (autorenew === 'cancelled') {
      toast({ title: 'Auto-renew cancelled', description: 'No payment method was saved.' });
      return;
    }
    if (autorenew !== 'success' || !pending.method) return;

    setAutoRenewBusy(true);
    serverConfirmAutoRenew({
      clientId: client.id,
      method: pending.method,
      fallbackLabel: pending.label,
    })
      .then((res) => {
        toast({
          title: 'Auto-renew enabled',
          description: `Your plan will renew automatically with ${res.methodLabel}.`,
        });
      })
      .catch((err: unknown) => {
        toast({
          variant: 'destructive',
          title: 'Could not enable auto-renew',
          description: getFriendlyErrorMessage(err, 'Please try again.'),
        });
      })
      .finally(() => setAutoRenewBusy(false));
  }, [client, searchParams, router, toast]);

  const handleDisableAutoRenew = useCallback(async () => {
    if (!client) return;
    if (!window.confirm('Turn off auto-renew? Your saved payment method will be removed.')) return;
    setAutoRenewBusy(true);
    try {
      await serverDisableAutoRenew({ clientId: client.id });
      toast({ title: 'Auto-renew turned off' });
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not turn off auto-renew',
        description: getFriendlyErrorMessage(err, 'Please try again.'),
      });
    } finally {
      setAutoRenewBusy(false);
    }
  }, [client, toast]);

  const subscriptionView = useMemo(() => {
    if (!client) {
      return {
        status: 'Inactive' as const,
        statusInfo: null,
        formattedEndDate: 'N/A',
        displayPlan: 'N/A',
        rate: 'N/A',
        currentPlanKey: 'unknown' as const,
        canRenew: false,
        actions: [],
      };
    }

    const subStatus = getClientSubscriptionStatus(client);
    const canRenew = canRenewSubscription(client);

    const infoMap = {
      Active: {
        variant: 'default' as const,
        icon: CheckCircle2,
        color: 'bg-emerald-500/15 text-emerald-800 border-emerald-400/50',
        banner: 'border-emerald-200/80 bg-emerald-50/80',
      },
      'Expiring Soon': {
        variant: 'destructive' as const,
        icon: Clock,
        color: 'bg-amber-500/15 text-amber-900 border-amber-400/50',
        banner: 'border-amber-200/80 bg-amber-50/80',
      },
      Expired: {
        variant: 'destructive' as const,
        icon: AlertTriangle,
        color: 'bg-red-500/15 text-red-800 border-red-400/50',
        banner: 'border-red-200/80 bg-red-50/80',
      },
      Inactive: {
        variant: 'secondary' as const,
        icon: AlertTriangle,
        color: '',
        banner: 'border-muted bg-muted/40',
      },
    };

    const currentPlanKey = normalizePlanKey(client.subscriptionPlanName);
    const isTrial = currentPlanKey === 'trial';

    return {
      status: subStatus,
      statusInfo: infoMap[subStatus],
      formattedEndDate: client.subscriptionEndDate
        ? format(new Date(client.subscriptionEndDate), 'MMMM dd, yyyy')
        : 'N/A',
      displayPlan: planDisplayLabel(client.subscriptionPlanName),
      rate: isTrial
        ? 'Free'
        : client.subscriptionRate !== undefined
          ? `₱${client.subscriptionRate.toLocaleString()}/${
              client.subscriptionBillingCycle === 'yearly' ? 'year' : 'month'
            }`
          : 'N/A',
      currentPlanKey,
      canRenew,
      actions: getSubscriptionActions(client.subscriptionPlanName, canRenew, billingCycle),
    };
  }, [client, billingCycle]);

  const handleCheckout = (amount: number, paymongoPlanName: string, cycle: BillingCycle) => {
    if (!client) return;
    setQrCheckout({
      amount,
      planName: paymongoPlanName,
      billingCycle: cycle,
      billingEndDate: client.subscriptionEndDate ?? '',
    });
  };

  if (authIsLoading || !client) {
    return (
      <div className="container mx-auto py-8 max-w-5xl">
        <p className="text-muted-foreground">Loading subscription details…</p>
      </div>
    );
  }

  if (isActivating) {
    return (
      <div className="container mx-auto py-20 max-w-5xl flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg font-medium">Activating your subscription…</p>
        <p className="text-sm text-muted-foreground">Please wait while we confirm your payment.</p>
      </div>
    );
  }

  const { status, statusInfo, formattedEndDate, displayPlan, rate, currentPlanKey, canRenew, actions } =
    subscriptionView;

  return (
    <div className="container mx-auto py-6 max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline flex items-center gap-3">
          <Award className="h-8 w-8 text-primary" />
          Subscription & Billing
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your Rental Pilot plan, renewals, and upgrades.
        </p>
      </div>

      <Card
        className={cn(
          'overflow-hidden border-2 shadow-sm',
          statusInfo?.banner
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                Current plan
              </p>
              <CardTitle className="text-2xl font-headline">{displayPlan}</CardTitle>
              <CardDescription className="mt-1">
                {status === 'Active'
                  ? 'Your subscription is in good standing.'
                  : status === 'Expiring Soon'
                    ? 'Renew soon to avoid interruption.'
                    : status === 'Expired'
                      ? 'Renew or upgrade to restore full access.'
                      : 'Choose a plan below to get started.'}
              </CardDescription>
            </div>
            {statusInfo && (
              <Badge
                variant={statusInfo.variant}
                className={cn('text-sm px-3 py-1 shrink-0', statusInfo.color)}
              >
                <statusInfo.icon className="h-4 w-4 mr-1.5" />
                {status}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-xl border bg-background/80 p-4 flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Current rate</p>
                <p className="font-semibold text-lg">{rate}</p>
              </div>
            </div>
            <div className="rounded-xl border bg-background/80 p-4 flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valid until</p>
                <p className="font-semibold text-lg">{formattedEndDate}</p>
              </div>
            </div>
          </div>
        </CardContent>
        {actions.length > 0 && (
          <CardFooter className="flex flex-col sm:flex-row flex-wrap gap-3 border-t bg-background/50 pt-6">
            {actions.map((action) => (
              <Button
                key={action.label}
                variant={action.variant ?? 'default'}
                onClick={() => handleCheckout(action.amount, action.paymongoPlanName, action.billingCycle)}
                className="sm:flex-1 min-w-[200px]"
              >
                {action.label.toLowerCase().includes('renew') ? (
                  <RefreshCw className="mr-2 h-4 w-4" />
                ) : action.label.toLowerCase().includes('upgrade') ? (
                  <ArrowUpRight className="mr-2 h-4 w-4" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                {action.label}
              </Button>
            ))}
          </CardFooter>
        )}
        {status === 'Active' && !canRenew && currentPlanKey === 'pro' && (
          <CardFooter className="border-t pt-4">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              You&apos;re on our best plan. Renewal opens {RENEWAL_WINDOW_DAYS} days before your due date.
            </p>
          </CardFooter>
        )}
        {status === 'Active' && !canRenew && currentPlanKey !== 'pro' && currentPlanKey !== 'unknown' && (
          <CardFooter className="border-t pt-4">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Renewal opens {RENEWAL_WINDOW_DAYS} days before {formattedEndDate}.
            </p>
          </CardFooter>
        )}
      </Card>

      {(currentPlanKey === 'basic' || currentPlanKey === 'pro') && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-xl font-headline flex items-center gap-2">
                  <RotateCw className="h-5 w-5 text-primary" /> Auto-renew
                </CardTitle>
                <CardDescription className="mt-1">
                  Automatically renew your {displayPlan} each month so you never lose access.
                </CardDescription>
              </div>
              <Switch
                checked={!!client.autoRenew}
                disabled={autoRenewBusy}
                onCheckedChange={(next) => {
                  if (next) setAutoRenewOpen(true);
                  else handleDisableAutoRenew();
                }}
                aria-label="Toggle auto-renew"
              />
            </div>
          </CardHeader>
          {client.autoRenew && (
            <CardContent>
              <div className="rounded-xl border bg-background/80 p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Payment method</p>
                    <p className="font-semibold">{client.autoRenewMethodLabel ?? 'Saved method'}</p>
                  </div>
                  {client.autoRenewStatus && client.autoRenewStatus !== 'active' && (
                    <Badge variant="destructive" className="ml-2 capitalize">
                      {client.autoRenewStatus.replace('_', ' ')}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={autoRenewBusy}
                    onClick={() => setAutoRenewOpen(true)}
                  >
                    Change
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={autoRenewBusy}
                    onClick={handleDisableAutoRenew}
                  >
                    <ShieldOff className="mr-1.5 h-4 w-4" /> Remove
                  </Button>
                </div>
              </div>
              {client.autoRenewMethod === 'gcash' && (
                <p className="text-xs text-muted-foreground mt-3">
                  GCash isn&apos;t supported for automatic charges. Near your due date we&apos;ll
                  auto-generate a renewal QR and email you a one-tap pay link.
                </p>
              )}
            </CardContent>
          )}
          {autoRenewBusy && (
            <CardFooter className="pt-0">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Working…
              </p>
            </CardFooter>
          )}
        </Card>
      )}

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
          <h2 className="text-xl font-bold font-headline">Compare plans</h2>
          <div className="inline-flex items-center rounded-lg border bg-muted/40 p-1 text-sm">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={cn(
                'rounded-md px-3 py-1.5 font-medium transition-colors',
                billingCycle === 'monthly' ? 'bg-background shadow-sm' : 'text-muted-foreground'
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('yearly')}
              className={cn(
                'rounded-md px-3 py-1.5 font-medium transition-colors flex items-center gap-1.5',
                billingCycle === 'yearly' ? 'bg-background shadow-sm' : 'text-muted-foreground'
              )}
            >
              Yearly
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">2 months free</Badge>
            </button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          All payments are processed securely through PayMongo.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const isCurrent = currentPlanKey === plan.key;
            const isProCurrent = currentPlanKey === 'pro';
            const planRate = getPlanRate(plan, billingCycle);
            let actionLabel: string | undefined;
            let onAction: (() => void) | undefined;

            if (plan.contactSales) {
              // Enterprise — contact sales, no self-serve checkout.
            } else if (plan.key === 'trial') {
              actionLabel = undefined;
            } else if (isCurrent) {
              if (canRenew) {
                actionLabel = `Renew ${plan.name}`;
                onAction = () => handleCheckout(planRate, plan.paymongoPlanName, billingCycle);
              }
            } else if (plan.key === 'basic') {
              if (!isProCurrent) {
                actionLabel =
                  currentPlanKey === 'unknown' || currentPlanKey === 'trial' || currentPlanKey === 'custom'
                    ? `Get ${plan.name}`
                    : `Switch to ${plan.name}`;
                onAction = () => handleCheckout(planRate, plan.paymongoPlanName, billingCycle);
              }
            } else if (plan.key === 'pro') {
              actionLabel = isCurrent
                ? canRenew
                  ? 'Renew Pro'
                  : undefined
                : 'Upgrade to Pro';
              if (actionLabel) {
                onAction = () => handleCheckout(planRate, plan.paymongoPlanName, billingCycle);
              }
            }

            const price =
              plan.rate === 0
                ? 'Free'
                : plan.contactSales
                  ? `Starts at ${formatPlanRate(plan, billingCycle)}`
                  : formatPlanRate(plan, billingCycle);
            const priceSubtext =
              plan.contactSales || plan.rate === 0
                ? undefined
                : billingCycle === 'yearly'
                  ? `₱${plan.rate.toLocaleString()}/mo billed monthly`
                  : `or ₱${plan.yearlyRate.toLocaleString()}/yr (2 months free)`;

            return (
              <PlanCard
                key={plan.key}
                planKey={plan.key}
                title={`${plan.name} Plan`}
                price={price}
                priceSubtext={priceSubtext}
                description={plan.description}
                features={plan.features}
                isCurrentPlan={isCurrent}
                actionLabel={plan.contactSales ? 'Contact Sales' : actionLabel}
                onAction={onAction}
                contactHref={
                  plan.contactSales
                    ? `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Enterprise plan inquiry')}`
                    : undefined
                }
              />
            );
          })}
        </div>
      </div>

      {qrCheckout && client && (
        <SubscriptionQrDialog
          isOpen={!!qrCheckout}
          onClose={() => setQrCheckout(null)}
          clientId={client.id}
          clientName={client.name}
          amount={qrCheckout.amount}
          planName={qrCheckout.planName}
          billingCycle={qrCheckout.billingCycle}
          billingEndDate={qrCheckout.billingEndDate}
        />
      )}

      {client && (currentPlanKey === 'basic' || currentPlanKey === 'pro') && (
        <AutoRenewDialog
          isOpen={autoRenewOpen}
          onClose={() => setAutoRenewOpen(false)}
          clientId={client.id}
          adminEmail={user?.email ?? ''}
          planLabel={displayPlan}
          billingCycle={billingCycle}
          pendingStorageKey={AUTORENEW_PENDING_KEY}
          onBusyChange={setAutoRenewBusy}
          onEnabled={(label) => {
            setAutoRenewOpen(false);
            toast({
              title: 'Auto-renew enabled',
              description: `Your plan will renew automatically with ${label}.`,
            });
          }}
        />
      )}
    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto py-8 max-w-5xl">
          <p className="text-muted-foreground">Loading subscription details…</p>
        </div>
      }
    >
      <SubscriptionPageContent />
    </Suspense>
  );
}
