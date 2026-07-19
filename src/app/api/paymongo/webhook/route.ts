import { NextResponse } from 'next/server';
import {
  verifyPaymongoSignature,
} from '@/lib/paymongo';
import {
  processPaidPaymongoLink,
  processPaidPaymongoCheckoutSession,
} from '@/lib/paymongo-process-link';
import { getAdminDb } from '@/lib/firebase-admin';
import {
  applyAutoRenewCharge,
  findRecordByCustomerId,
  findRecordBySubscriptionId,
} from '@/lib/paymongo-subscriptions';

export const runtime = 'nodejs';

const HANDLED_EVENTS = new Set([
  'link.payment.paid',
  'payment.paid',
  'payment.failed',
  'checkout_session.payment.paid',
  'subscription.updated',
  'subscription.cancelled',
]);

const SUBSCRIPTION_FAILURE_EVENTS = new Set(['payment.failed', 'subscription.cancelled']);

async function markEventProcessed(eventId: string): Promise<boolean> {
  const db = getAdminDb();
  const ref = db.collection('paymongoWebhookEvents').doc(eventId);
  const existing = await ref.get();
  if (existing.exists) return false;
  await ref.set({ processedAt: new Date().toISOString() });
  return true;
}

function extractPaymentResource(payload: Record<string, unknown>): {
  id: string;
  kind: 'link' | 'checkout_session';
} | null {
  const data = payload?.data as {
    attributes?: {
      type?: string;
      data?: { id?: string; type?: string };
    };
  };
  const attrs = data?.attributes;
  const inner = attrs?.data;
  if (!inner?.id) return null;

  if (inner.type === 'link' || attrs?.type === 'link.payment.paid') {
    return { id: inner.id, kind: 'link' };
  }
  if (
    inner.type === 'checkout_session' ||
    attrs?.type === 'checkout_session.payment.paid'
  ) {
    return { id: inner.id, kind: 'checkout_session' };
  }
  return null;
}

function pickId(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const id = (value as Record<string, unknown>).id;
    if (typeof id === 'string') return id;
  }
  return undefined;
}

/**
 * Reconciles PayMongo subscription (auto-renew) events against our
 * `paymongoSubscriptions` records: extends the client's cycle on success, or
 * reflects a failed/cancelled status.
 */
async function reconcileSubscriptionEvent(
  payload: Record<string, unknown>,
  eventType: string
): Promise<{ processed: boolean; message?: string }> {
  const inner = (payload?.data as { attributes?: { data?: Record<string, unknown> } })?.attributes
    ?.data;
  const attrs = (inner?.attributes as Record<string, unknown>) ?? {};

  const subscriptionId =
    pickId(attrs.subscription_id) ??
    pickId(attrs.subscription) ??
    (inner?.type === 'subscription' ? pickId(inner.id) : undefined);
  const customerId = pickId(attrs.customer_id) ?? pickId(attrs.customer);
  const paymentIntentId = pickId(attrs.payment_intent_id) ?? pickId(attrs.payment_intent);

  const record = subscriptionId
    ? await findRecordBySubscriptionId(subscriptionId)
    : customerId
      ? await findRecordByCustomerId(customerId)
      : null;

  if (!record) {
    return { processed: false, message: 'no_matching_subscription' };
  }

  const db = getAdminDb();

  if (SUBSCRIPTION_FAILURE_EVENTS.has(eventType)) {
    const newStatus = eventType === 'subscription.cancelled' ? 'none' : 'past_due';
    await db.collection('clients').doc(record.clientId).set(
      { autoRenewStatus: newStatus, ...(newStatus === 'none' ? { autoRenew: false } : {}) },
      { merge: true }
    );
    return { processed: true, message: `status:${newStatus}` };
  }

  await applyAutoRenewCharge({
    clientId: record.clientId,
    paymentIntentId: paymentIntentId ?? null,
  });
  return { processed: true, message: 'renewed' };
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
  const secretKey = process.env.PAYMONGO_SECRET_KEY;

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventType = (payload?.data as { attributes?: { type?: string } })?.attributes?.type;
  const eventId = (payload?.data as { id?: string })?.id;
  const livemode = (payload?.data as { attributes?: { livemode?: boolean } })?.attributes
    ?.livemode ?? false;

  if (!eventType || !eventId) {
    return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
  }

  if (!HANDLED_EVENTS.has(eventType)) {
    return NextResponse.json({ received: true, skipped: eventType });
  }

  if (webhookSecret) {
    const signature = request.headers.get('paymongo-signature');
    const valid = verifyPaymongoSignature(rawBody, signature, webhookSecret, livemode);
    if (!valid) {
      console.error('[PayMongo Webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  } else {
    console.warn('[PayMongo Webhook] PAYMONGO_WEBHOOK_SECRET not set — skipping signature check');
  }

  const shouldProcess = await markEventProcessed(eventId);
  if (!shouldProcess) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (!secretKey) {
    console.error('[PayMongo Webhook] PAYMONGO_SECRET_KEY not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  try {
    // Subscription (auto-renew) events: reconcile against paymongoSubscriptions.
    if (
      eventType === 'subscription.updated' ||
      eventType === 'subscription.cancelled' ||
      eventType === 'payment.failed'
    ) {
      const sub = await reconcileSubscriptionEvent(payload, eventType);
      return NextResponse.json({ received: true, subscription: sub.message ?? 'processed' });
    }

    const resource = extractPaymentResource(payload);
    if (!resource) {
      // Not a link/checkout payment — try to reconcile as a subscription auto-charge.
      const sub = await reconcileSubscriptionEvent(payload, eventType);
      if (sub.processed) {
        return NextResponse.json({ received: true, subscription: sub.message });
      }
      console.warn('[PayMongo Webhook] No payment resource in event — cannot resolve metadata');
      return NextResponse.json({ received: true, warning: 'no_payment_resource' });
    }

    const result =
      resource.kind === 'checkout_session'
        ? await processPaidPaymongoCheckoutSession(resource.id, secretKey)
        : await processPaidPaymongoLink(resource.id, secretKey);

    if (!result.processed) {
      // Could be a subscription invoice payment rather than a one-off link.
      const sub = await reconcileSubscriptionEvent(payload, eventType);
      if (sub.processed) {
        return NextResponse.json({ received: true, subscription: sub.message });
      }
      return NextResponse.json({ received: true, warning: result.message });
    }

    return NextResponse.json({
      received: true,
      processed: result.paymentType,
      paymentId: resource.id,
      duplicate: result.duplicate,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Webhook processing failed';
    console.error('[PayMongo Webhook] Processing error:', message);

    if (eventId) {
      try {
        await getAdminDb().collection('paymongoWebhookEvents').doc(eventId).delete();
      } catch {
        // allow PayMongo retry
      }
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
