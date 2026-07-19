import { getAdminDb } from '@/lib/firebase-admin';
import type { PaymongoPaymentMetadata } from '@/lib/paymongo';
import { canonicalPlanName, getPlanDefinition, normalizePlanKey } from '@/lib/subscription-plans';
import {
  canRenewSubscription,
  computeSubscriptionEndDate,
} from '@/lib/subscription-status';

export { computeSubscriptionEndDate };

export async function handleSubscriptionPayment(
  metadata: Extract<PaymongoPaymentMetadata, { paymentType: 'subscription' }>,
  paidAmount?: number
): Promise<void> {
  const db = getAdminDb();
  const clientRef = db.collection('clients').doc(metadata.clientId);
  const clientSnap = await clientRef.get();

  if (!clientSnap.exists) {
    throw new Error(`Client not found: ${metadata.clientId}`);
  }

  const clientData = clientSnap.data()!;
  const planDef = getPlanDefinition(metadata.planName);
  const storedPlanName = canonicalPlanName(metadata.planName);
  const rate =
    paidAmount && paidAmount > 0
      ? paidAmount
      : planDef?.rate ?? clientData.subscriptionRate ?? 0;

  // Due date frozen at checkout — webhook may activate before the browser confirm step runs
  const billingAnchor =
    metadata.billingEndDate?.trim() || clientData.subscriptionEndDate;
  const billingCycle = metadata.billingCycle === 'yearly' ? 'yearly' : 'monthly';
  const newEndDate = computeSubscriptionEndDate(billingAnchor, billingCycle);

  const alreadyApplied =
    clientData.subscriptionStatus === 'active' &&
    clientData.subscriptionEndDate === newEndDate &&
    normalizePlanKey(clientData.subscriptionPlanName) === normalizePlanKey(storedPlanName);

  if (alreadyApplied) {
    console.log(
      `[PayMongo] Subscription already active for client ${metadata.clientId} until ${newEndDate}`
    );
    return;
  }

  const currentPlanKey = normalizePlanKey(clientData.subscriptionPlanName);
  const paidPlanKey = normalizePlanKey(metadata.planName);
  const isSamePlanRenewal =
    currentPlanKey !== 'unknown' &&
    paidPlanKey !== 'unknown' &&
    currentPlanKey === paidPlanKey;

  if (isSamePlanRenewal) {
    const clientForRenewalCheck = {
      subscriptionStatus: clientData.subscriptionStatus,
      subscriptionEndDate: billingAnchor,
    };
    if (!canRenewSubscription(clientForRenewalCheck)) {
      throw new Error(
        'Renewal is only available within 3 days of your subscription end date.'
      );
    }
  }

  await clientRef.set(
    {
      subscriptionStatus: 'active',
      subscriptionEndDate: newEndDate,
      subscriptionPlanName: storedPlanName,
      subscriptionRate: rate,
      subscriptionBillingCycle: billingCycle,
    },
    { merge: true }
  );

  console.log(
    `[PayMongo] Subscription extended for client ${metadata.clientId} until ${newEndDate}`
  );
}

export async function handleRentPayment(
  metadata: Extract<PaymongoPaymentMetadata, { paymentType: 'rent' }>,
  paidAmount: number
): Promise<void> {
  const db = getAdminDb();

  const tenantRef = db.collection('tenants').doc(metadata.tenantId);
  const tenantSnap = await tenantRef.get();
  if (!tenantSnap.exists) {
    throw new Error(`Tenant not found: ${metadata.tenantId}`);
  }

  await db.collection('payments').add({
    tenantId: metadata.tenantId,
    clientId: metadata.clientId,
    date: new Date().toISOString(),
    amount: paidAmount,
    paymentMethod: 'Gcash',
    discountApplied: 0,
    discountDescription: 'PayMongo online payment',
  });

  console.log(
    `[PayMongo] Rent payment recorded for tenant ${metadata.tenantId}, amount ₱${paidAmount}`
  );
}

export async function processPaymongoMetadata(
  metadata: PaymongoPaymentMetadata,
  paidAmount?: number
): Promise<void> {
  if (metadata.paymentType === 'subscription') {
    await handleSubscriptionPayment(metadata, paidAmount);
    return;
  }

  if (metadata.paymentType === 'rent') {
    const amount = paidAmount ?? 0;
    if (amount <= 0) {
      throw new Error('Rent payment amount missing from webhook payload');
    }
    await handleRentPayment(metadata, amount);
  }
}
