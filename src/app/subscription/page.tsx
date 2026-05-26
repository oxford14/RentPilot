
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
import {
  SUBSCRIPTION_PLANS,
  getSubscriptionActions,
  normalizePlanKey,
  planDisplayLabel,
  type PlanKey,
} from '@/lib/subscription-plans';
import {
  canRenewSubscription,
  getClientSubscriptionStatus,
  RENEWAL_WINDOW_DAYS,
} from '@/lib/subscription-status';

const PENDING_SUBSCRIPTION_KEY = 'paymongo_pending_subscription';

function PlanCard({
  planKey,
  title,
  price,
  description,
  features,
  isCurrentPlan = false,
  actionLabel,
  onAction,
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
        {onAction && actionLabel ? (
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

  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

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
    async (sessionId: string) => {
      if (!client) return;

      const maxAttempts = 8;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const response = await fetch('/api/paymongo/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, clientId: client.id }),
        });
        const data = await response.json();

        if (response.ok && (data.processed || data.duplicate)) {
          sessionStorage.removeItem(PENDING_SUBSCRIPTION_KEY);
          router.replace('/subscription');
          toast({
            title: data.duplicate ? 'Subscription active' : 'Subscription activated',
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

    let sessionId = searchParams.get('session_id');
    if (!sessionId) {
      try {
        const raw = sessionStorage.getItem(PENDING_SUBSCRIPTION_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { sessionId?: string };
          sessionId = parsed.sessionId ?? null;
        }
      } catch {
        sessionStorage.removeItem(PENDING_SUBSCRIPTION_KEY);
      }
    }

    if (!sessionId) {
      router.replace('/subscription');
      toast({
        variant: 'destructive',
        title: 'Could not verify payment',
        description: 'Please try again from the plan options below.',
      });
      return;
    }

    setIsActivating(true);
    activateSubscription(sessionId)
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Could not activate subscription.';
        toast({ variant: 'destructive', title: 'Activation failed', description: message });
        router.replace('/subscription');
      })
      .finally(() => setIsActivating(false));
  }, [client, searchParams, router, toast, activateSubscription]);

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
          ? `₱${client.subscriptionRate.toLocaleString()}/month`
          : 'N/A',
      currentPlanKey,
      canRenew,
      actions: getSubscriptionActions(client.subscriptionPlanName, canRenew),
    };
  }, [client]);

  const handleCheckout = async (amount: number, paymongoPlanName: string) => {
    if (!client || isRedirecting) return;
    setIsRedirecting(true);

    try {
      const response = await fetch('/api/paymongo/create-source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          paymentType: 'subscription',
          details: {
            clientId: client.id,
            clientName: client.name,
            planName: paymongoPlanName,
            billingEndDate: client.subscriptionEndDate ?? '',
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start checkout.');
      }

      const sessionId = data.sessionId as string | undefined;
      if (!sessionId || !data.checkoutUrl) {
        throw new Error('Invalid checkout response from server.');
      }

      sessionStorage.setItem(
        PENDING_SUBSCRIPTION_KEY,
        JSON.stringify({ sessionId, clientId: client.id })
      );
      window.location.href = data.checkoutUrl;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not start payment.';
      toast({ variant: 'destructive', title: 'Payment error', description: message });
      setIsRedirecting(false);
    }
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
          Manage your RentPilot plan, renewals, and upgrades.
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
                <p className="text-xs text-muted-foreground">Monthly rate</p>
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
                disabled={isRedirecting}
                onClick={() => handleCheckout(action.amount, action.paymongoPlanName)}
                className="sm:flex-1 min-w-[200px]"
              >
                {isRedirecting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : action.label.toLowerCase().includes('renew') ? (
                  <RefreshCw className="mr-2 h-4 w-4" />
                ) : action.label.toLowerCase().includes('upgrade') ? (
                  <ArrowUpRight className="mr-2 h-4 w-4" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                {isRedirecting ? 'Redirecting to PayMongo…' : action.label}
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

      <div>
        <h2 className="text-xl font-bold font-headline mb-1">Compare plans</h2>
        <p className="text-sm text-muted-foreground mb-5">
          All payments are processed securely through PayMongo.
        </p>
        <div className="grid md:grid-cols-3 gap-5">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const isCurrent = currentPlanKey === plan.key;
            const isProCurrent = currentPlanKey === 'pro';
            let actionLabel: string | undefined;
            let onAction: (() => void) | undefined;

            if (plan.key === 'trial') {
              actionLabel = undefined;
            } else if (isCurrent) {
              if (canRenew) {
                actionLabel = `Renew ${plan.name}`;
                onAction = () => handleCheckout(plan.rate, plan.paymongoPlanName);
              }
            } else if (plan.key === 'basic') {
              if (!isProCurrent) {
                actionLabel =
                  currentPlanKey === 'unknown' || currentPlanKey === 'trial' || currentPlanKey === 'custom'
                    ? `Get ${plan.name}`
                    : `Switch to ${plan.name}`;
                onAction = () => handleCheckout(plan.rate, plan.paymongoPlanName);
              }
            } else if (plan.key === 'pro') {
              actionLabel = isCurrent
                ? canRenew
                  ? 'Renew Pro'
                  : undefined
                : 'Upgrade to Pro';
              if (actionLabel) {
                onAction = () => handleCheckout(plan.rate, plan.paymongoPlanName);
              }
            }

            return (
              <PlanCard
                key={plan.key}
                planKey={plan.key}
                title={`${plan.name} Plan`}
                price={plan.rate === 0 ? 'Free' : `₱${plan.rate} / month`}
                description={plan.description}
                features={plan.features}
                isCurrentPlan={isCurrent}
                actionLabel={actionLabel}
                onAction={onAction}
                disabled={isRedirecting}
              />
            );
          })}
        </div>
      </div>
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
