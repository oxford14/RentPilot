import 'server-only';
import { getAdminDb } from '@/lib/firebase-admin';
import { getPaymongoAuthHeader } from '@/lib/paymongo';
import { canonicalPlanName } from '@/lib/subscription-plans';
import type { PlanKey } from '@/lib/subscription-plans';
import { computeSubscriptionEndDate } from '@/lib/subscription-status';

const PAYMONGO_API = 'https://api.paymongo.com/v1';

export type AutoRenewMethod = 'card' | 'paymaya' | 'gcash';

export type PaymongoSubscriptionRecord = {
  clientId: string;
  customerId?: string;
  subscriptionId?: string;
  planId?: string;
  method: AutoRenewMethod;
  defaultPaymentMethodId?: string;
  /** Guards against double-extending for the same charge (confirm + webhook). */
  lastPaymentIntentId?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type PaymongoResource = { id?: string; type?: string; attributes?: Record<string, unknown> };

function getSecretKey(): string {
  const key = process.env.PAYMONGO_SECRET_KEY;
  if (!key) throw new Error('PayMongo secret key is not configured.');
  return key;
}

async function paymongoRequest(
  path: string,
  init: { method?: string; body?: unknown } = {}
): Promise<PaymongoResource> {
  const res = await fetch(`${PAYMONGO_API}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
      authorization: getPaymongoAuthHeader(getSecretKey()),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });

  const data = await res.json();
  if (!res.ok || data?.errors) {
    const detail =
      data?.errors?.map((e: { detail?: string }) => e.detail).filter(Boolean).join(', ') ||
      `PayMongo request failed (${res.status}).`;
    throw new Error(detail);
  }
  return (data?.data ?? {}) as PaymongoResource;
}

// ---- Plan IDs (seeded via src/scripts/seed-paymongo-plans.ts) ----

type PlanIdMap = { basic?: string; pro?: string };

export async function getPaymongoPlanConfig(): Promise<{
  cardPlans: PlanIdMap;
  mayaPlans: PlanIdMap;
}> {
  const db = getAdminDb();
  const snap = await db.collection('systemSettings').doc('paymongo').get();
  const data = snap.data() ?? {};
  return {
    cardPlans: (data.cardPlans ?? {}) as PlanIdMap,
    mayaPlans: (data.mayaPlans ?? {}) as PlanIdMap,
  };
}

export async function resolvePlanId(
  method: AutoRenewMethod,
  planKey: PlanKey
): Promise<string> {
  if (planKey !== 'basic' && planKey !== 'pro') {
    throw new Error('Auto-renew is only available on the Basic or Pro plan.');
  }
  const config = await getPaymongoPlanConfig();
  const map = method === 'paymaya' ? config.mayaPlans : config.cardPlans;
  const planId = map[planKey];
  if (!planId) {
    throw new Error(
      'PayMongo plans are not configured yet. Run the seed script (src/scripts/seed-paymongo-plans.ts) after enabling Subscriptions on your PayMongo account.'
    );
  }
  return planId;
}

// ---- Subscription record store (server-only) ----

function recordRef(clientId: string) {
  return getAdminDb().collection('paymongoSubscriptions').doc(clientId);
}

export async function getSubscriptionRecord(
  clientId: string
): Promise<PaymongoSubscriptionRecord | null> {
  const snap = await recordRef(clientId).get();
  return snap.exists ? (snap.data() as PaymongoSubscriptionRecord) : null;
}

export async function saveSubscriptionRecord(
  clientId: string,
  patch: Partial<PaymongoSubscriptionRecord>
): Promise<void> {
  const now = new Date().toISOString();
  const existing = await getSubscriptionRecord(clientId);
  await recordRef(clientId).set(
    {
      clientId,
      createdAt: existing?.createdAt ?? now,
      ...patch,
      updatedAt: now,
    },
    { merge: true }
  );
}

export async function deleteSubscriptionRecord(clientId: string): Promise<void> {
  await recordRef(clientId).delete();
}

// ---- Customer / subscription helpers ----

export async function getOrCreatePaymongoCustomer(params: {
  clientId: string;
  name: string;
  email: string;
  phone?: string;
}): Promise<string> {
  const existing = await getSubscriptionRecord(params.clientId);
  if (existing?.customerId) return existing.customerId;

  const resource = await paymongoRequest('/customers', {
    method: 'POST',
    body: {
      data: {
        attributes: {
          first_name: params.name.split(' ')[0] || params.name || 'RentPilot',
          last_name: params.name.split(' ').slice(1).join(' ') || 'Client',
          email: params.email,
          phone: params.phone || undefined,
          default_device: 'phone',
        },
      },
    },
  });

  if (!resource.id) throw new Error('Failed to create PayMongo customer.');
  await saveSubscriptionRecord(params.clientId, {
    customerId: resource.id,
    status: 'incomplete',
  });
  return resource.id;
}

export type StartSubscriptionResult = {
  subscriptionId: string;
  paymentIntentId: string;
  clientKey: string;
  status: string;
};

/**
 * Creates a PayMongo subscription for a customer + plan and resolves the first
 * invoice's payment intent so the client can complete the initial payment
 * (which vaults the card / links Maya).
 */
export async function createSubscription(params: {
  customerId: string;
  planId: string;
}): Promise<StartSubscriptionResult> {
  const sub = await paymongoRequest('/subscriptions', {
    method: 'POST',
    body: {
      data: {
        attributes: {
          customer: params.customerId,
          plan: params.planId,
        },
      },
    },
  });

  if (!sub.id) throw new Error('Failed to create PayMongo subscription.');

  const attrs = (sub.attributes ?? {}) as Record<string, unknown>;
  const paymentIntentId = extractPaymentIntentId(attrs);
  if (!paymentIntentId) {
    throw new Error(
      'PayMongo did not return a first-invoice payment intent. Verify Subscriptions is enabled on your account.'
    );
  }

  const intent = await paymongoRequest(`/payment_intents/${paymentIntentId}`);
  const clientKey = String((intent.attributes as Record<string, unknown>)?.client_key ?? '');
  if (!clientKey) throw new Error('Could not resolve payment intent client key.');

  return {
    subscriptionId: sub.id,
    paymentIntentId,
    clientKey,
    status: String(attrs.status ?? 'incomplete'),
  };
}

/** Defensively locate the first invoice's payment intent id across possible shapes. */
function extractPaymentIntentId(attrs: Record<string, unknown>): string | null {
  const invoice =
    (attrs.latest_invoice as Record<string, unknown> | undefined) ??
    (Array.isArray(attrs.invoices) ? (attrs.invoices[0] as Record<string, unknown>) : undefined);

  const invoiceAttrs = (invoice?.attributes as Record<string, unknown>) ?? invoice ?? {};

  const pi =
    invoiceAttrs.payment_intent ??
    (invoiceAttrs as Record<string, unknown>).payment_intent_id ??
    attrs.payment_intent;

  if (typeof pi === 'string') return pi;
  if (pi && typeof pi === 'object') {
    const id = (pi as Record<string, unknown>).id;
    if (typeof id === 'string') return id;
  }
  return null;
}

export async function getSubscription(subscriptionId: string): Promise<PaymongoResource> {
  return paymongoRequest(`/subscriptions/${subscriptionId}`);
}

/**
 * Fetches a payment intent and derives its status plus a display-safe method
 * label (e.g. "Visa ...4242", "Maya") from the succeeded payment, when present.
 */
export async function getPaymentIntentDetails(paymentIntentId: string): Promise<{
  status: string;
  methodLabel: string | null;
  paymentMethodId: string | null;
}> {
  const intent = await paymongoRequest(`/payment_intents/${paymentIntentId}`);
  const attrs = (intent.attributes ?? {}) as Record<string, unknown>;
  const status = String(attrs.status ?? 'unknown');

  let methodLabel: string | null = null;
  let paymentMethodId: string | null = null;

  const payments = attrs.payments as Array<Record<string, unknown>> | undefined;
  const firstPayment = payments?.[0];
  const paymentAttrs = (firstPayment?.attributes as Record<string, unknown>) ?? {};
  const source = paymentAttrs.source as Record<string, unknown> | undefined;
  const pm =
    (paymentAttrs.payment_method as Record<string, unknown> | undefined) ??
    (attrs.payment_method as Record<string, unknown> | undefined);

  if (pm) {
    paymentMethodId = typeof pm.id === 'string' ? pm.id : null;
    const pmAttrs = (pm.attributes as Record<string, unknown>) ?? pm;
    const type = String(pmAttrs.type ?? source?.type ?? '');
    if (type === 'card') {
      const details = (pmAttrs.details as Record<string, unknown>) ?? {};
      const brand = String(details.brand ?? 'Card');
      const last4 = String(details.last4 ?? '');
      methodLabel = last4 ? `${capitalize(brand)} ...${last4}` : capitalize(brand);
    } else if (type === 'paymaya') {
      methodLabel = 'Maya';
    } else if (type) {
      methodLabel = capitalize(type);
    }
  } else if (source?.type) {
    methodLabel = source.type === 'paymaya' ? 'Maya' : capitalize(String(source.type));
  }

  return { status, methodLabel, paymentMethodId };
}

function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

export async function cancelSubscription(subscriptionId: string): Promise<void> {
  await paymongoRequest(`/subscriptions/${subscriptionId}`, { method: 'DELETE' });
}

/**
 * Initiate an on-demand payment for a Maya subscription (called by the scheduler
 * each cycle). Returns the payment intent id so callers can track status.
 */
export async function initiateOnDemandPayment(
  subscriptionId: string
): Promise<{ paymentIntentId: string | null; status: string }> {
  const resource = await paymongoRequest(`/subscriptions/${subscriptionId}/payments`, {
    method: 'POST',
    body: { data: { attributes: {} } },
  });
  const attrs = (resource.attributes ?? {}) as Record<string, unknown>;
  return {
    paymentIntentId: extractPaymentIntentId(attrs) ?? resource.id ?? null,
    status: String(attrs.status ?? 'processing'),
  };
}

/**
 * Idempotently extends a client's RentPilot subscription by one cycle after an
 * auto-renew charge succeeds. Safe to call from both the confirm action and the
 * webhook for the same charge: the `lastPaymentIntentId` guard prevents
 * double-extension. When `paymentIntentId` is null/unknown, extension is applied
 * without the guard (used only where duplicates cannot occur).
 */
export async function applyAutoRenewCharge(params: {
  clientId: string;
  paymentIntentId?: string | null;
  planName?: string;
  nextBillingDate?: string | null;
}): Promise<{ extended: boolean; endDate?: string }> {
  const db = getAdminDb();
  const clientRef = db.collection('clients').doc(params.clientId);
  const clientSnap = await clientRef.get();
  if (!clientSnap.exists) throw new Error(`Client not found: ${params.clientId}`);
  const clientData = clientSnap.data()!;

  if (params.paymentIntentId) {
    const record = await getSubscriptionRecord(params.clientId);
    if (record?.lastPaymentIntentId && record.lastPaymentIntentId === params.paymentIntentId) {
      return { extended: false, endDate: clientData.subscriptionEndDate };
    }
  }

  const newEndDate =
    params.nextBillingDate ?? computeSubscriptionEndDate(clientData.subscriptionEndDate);

  const update: Record<string, unknown> = {
    subscriptionStatus: 'active',
    subscriptionEndDate: newEndDate,
    autoRenewStatus: 'active',
  };
  if (params.planName) {
    update.subscriptionPlanName = canonicalPlanName(params.planName);
  }
  await clientRef.set(update, { merge: true });

  await saveSubscriptionRecord(params.clientId, {
    status: 'active',
    lastPaymentIntentId: params.paymentIntentId ?? undefined,
  });

  return { extended: true, endDate: newEndDate };
}

/** Locate the paymongoSubscriptions record whose customerId matches. */
export async function findRecordByCustomerId(
  customerId: string
): Promise<PaymongoSubscriptionRecord | null> {
  const snap = await getAdminDb()
    .collection('paymongoSubscriptions')
    .where('customerId', '==', customerId)
    .limit(1)
    .get();
  return snap.empty ? null : (snap.docs[0].data() as PaymongoSubscriptionRecord);
}

/** Locate the paymongoSubscriptions record whose subscriptionId matches. */
export async function findRecordBySubscriptionId(
  subscriptionId: string
): Promise<PaymongoSubscriptionRecord | null> {
  const snap = await getAdminDb()
    .collection('paymongoSubscriptions')
    .where('subscriptionId', '==', subscriptionId)
    .limit(1)
    .get();
  return snap.empty ? null : (snap.docs[0].data() as PaymongoSubscriptionRecord);
}

/** Reads the subscription's next billing date (ISO) if present. */
export function extractNextBillingDate(subscription: PaymongoResource): string | null {
  const attrs = (subscription.attributes ?? {}) as Record<string, unknown>;
  const raw =
    attrs.next_billing_schedule ??
    attrs.next_billing_date ??
    (attrs.current_period_end as unknown);
  if (!raw) return null;
  if (typeof raw === 'number') {
    // PayMongo uses unix seconds for timestamps
    return new Date(raw * 1000).toISOString();
  }
  const parsed = new Date(String(raw));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
