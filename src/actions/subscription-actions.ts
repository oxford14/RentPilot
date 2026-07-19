'use server';

import { getAdminDb } from '@/lib/firebase-admin';
import {
  getOrCreatePaymongoCustomer,
  createSubscription,
  cancelSubscription,
  getPaymentIntentDetails,
  getSubscriptionRecord,
  saveSubscriptionRecord,
  deleteSubscriptionRecord,
  applyAutoRenewCharge,
  resolvePlanId,
  type AutoRenewMethod,
} from '@/lib/paymongo-subscriptions';
import { getPlanByKey, normalizePlanKey } from '@/lib/subscription-plans';
import type { Client } from '@/lib/types';

async function loadClient(clientId: string): Promise<Client> {
  const snap = await getAdminDb().collection('clients').doc(clientId).get();
  if (!snap.exists) throw new Error('Client not found.');
  return { id: snap.id, ...(snap.data() as Omit<Client, 'id'>) };
}

function resolvePaidPlanKey(client: Client): 'basic' | 'pro' {
  const key = normalizePlanKey(client.subscriptionPlanName);
  if (key === 'pro') return 'pro';
  if (key === 'basic') return 'basic';
  throw new Error(
    'Auto-renew requires an active Basic or Pro plan. Subscribe to a plan first, then enable auto-renew.'
  );
}

export type StartAutoRenewResult = {
  subscriptionId: string;
  paymentIntentId: string;
  clientKey: string;
  publicKey: string;
};

/**
 * Card / Maya: creates the PayMongo customer + subscription and returns the
 * first-invoice payment intent for the client to complete (vault card / link Maya).
 */
export async function serverStartAutoRenew(params: {
  clientId: string;
  method: Exclude<AutoRenewMethod, 'gcash'>;
  adminEmail: string;
}): Promise<StartAutoRenewResult> {
  const publicKey = process.env.NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY;
  if (!publicKey) throw new Error('PayMongo public key is not configured.');
  if (!params.adminEmail) throw new Error('A billing email is required for auto-renew.');

  const client = await loadClient(params.clientId);
  const planKey = resolvePaidPlanKey(client);
  const planId = await resolvePlanId(params.method, planKey);

  const customerId = await getOrCreatePaymongoCustomer({
    clientId: client.id,
    name: client.name || 'RentPilot Client',
    email: params.adminEmail,
  });

  const sub = await createSubscription({ customerId, planId });

  await saveSubscriptionRecord(client.id, {
    customerId,
    subscriptionId: sub.subscriptionId,
    planId,
    method: params.method,
    status: sub.status,
  });

  return {
    subscriptionId: sub.subscriptionId,
    paymentIntentId: sub.paymentIntentId,
    clientKey: sub.clientKey,
    publicKey,
  };
}

/**
 * Verifies the first payment succeeded server-side, then persists the auto-renew
 * state on the client and extends the current cycle.
 */
export async function serverConfirmAutoRenew(params: {
  clientId: string;
  method: Exclude<AutoRenewMethod, 'gcash'>;
  fallbackLabel?: string;
}): Promise<{ success: boolean; methodLabel: string; endDate?: string }> {
  const record = await getSubscriptionRecord(params.clientId);
  if (!record?.subscriptionId) {
    throw new Error('No pending auto-renew subscription found. Please start again.');
  }

  const client = await loadClient(params.clientId);
  const planKey = resolvePaidPlanKey(client);
  const planName = getPlanByKey(planKey).paymongoPlanName;

  const intentId = record.lastPaymentIntentId ?? null;
  const details = intentId ? await getPaymentIntentDetails(intentId) : null;

  // When we have the intent, verify server-side. Without it (rare timing), rely on
  // the webhook to reconcile and accept the setup optimistically.
  const status = details?.status ?? 'succeeded';
  const methodLabel = details?.methodLabel ?? null;

  const succeeded = status === 'succeeded' || status === 'active' || status === 'processing';
  if (!succeeded) {
    throw new Error('Payment has not completed yet. Please finish the payment and try again.');
  }

  const label = methodLabel || params.fallbackLabel || (params.method === 'paymaya' ? 'Maya' : 'Card');

  const charge = await applyAutoRenewCharge({
    clientId: params.clientId,
    paymentIntentId: intentId,
    planName,
  });

  await getAdminDb().collection('clients').doc(params.clientId).set(
    {
      autoRenew: true,
      autoRenewMethod: params.method,
      autoRenewMethodLabel: label,
      autoRenewStatus: 'active',
    },
    { merge: true }
  );

  await saveSubscriptionRecord(params.clientId, { status: 'active' });

  return { success: true, methodLabel: label, endDate: charge.endDate };
}

/** Records the first-invoice payment intent id once the client attaches the method. */
export async function serverSetAutoRenewPaymentIntent(params: {
  clientId: string;
  paymentIntentId: string;
}): Promise<void> {
  await saveSubscriptionRecord(params.clientId, {
    lastPaymentIntentId: params.paymentIntentId,
  });
}

export async function serverDisableAutoRenew(params: {
  clientId: string;
}): Promise<{ success: boolean }> {
  const record = await getSubscriptionRecord(params.clientId);
  if (record?.subscriptionId) {
    try {
      await cancelSubscription(record.subscriptionId);
    } catch (err) {
      console.error('[AutoRenew] Failed to cancel PayMongo subscription:', err);
    }
  }
  await deleteSubscriptionRecord(params.clientId);

  await getAdminDb().collection('clients').doc(params.clientId).set(
    {
      autoRenew: false,
      autoRenewMethod: null,
      autoRenewMethodLabel: null,
      autoRenewStatus: 'none',
    },
    { merge: true }
  );

  return { success: true };
}

/**
 * GCash assisted: no PayMongo subscription. The scheduler auto-generates a renewal
 * QR and emails the client admin a pay link near the due date.
 */
export async function serverEnableGcashAssisted(params: {
  clientId: string;
}): Promise<{ success: boolean }> {
  const client = await loadClient(params.clientId);
  resolvePaidPlanKey(client); // guard: must be on a paid plan

  await saveSubscriptionRecord(params.clientId, {
    method: 'gcash',
    status: 'active',
  });

  await getAdminDb().collection('clients').doc(params.clientId).set(
    {
      autoRenew: true,
      autoRenewMethod: 'gcash',
      autoRenewMethodLabel: 'GCash',
      autoRenewStatus: 'active',
    },
    { merge: true }
  );

  return { success: true };
}
