import { addMonths, startOfDay, isBefore } from 'date-fns';
import { getAdminDb } from '@/lib/firebase-admin';
import type { PaymongoPaymentMetadata } from '@/lib/paymongo';

const PLAN_RATES: Record<string, number> = {
  'basic plan': 200,
  'pro plan': 500,
  trial: 0,
};

function normalizePlanName(planName: string): string {
  return planName.trim().toLowerCase();
}

export function computeSubscriptionEndDate(currentEndDate?: string): string {
  const today = startOfDay(new Date());
  let baseDate = today;

  if (currentEndDate) {
    const existingEnd = startOfDay(new Date(currentEndDate));
    if (isBefore(today, existingEnd) || today.getTime() === existingEnd.getTime()) {
      baseDate = existingEnd;
    }
  }

  return addMonths(baseDate, 1).toISOString();
}

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
  const planKey = normalizePlanName(metadata.planName);
  const rate =
    paidAmount && paidAmount > 0
      ? paidAmount
      : PLAN_RATES[planKey] ?? clientData.subscriptionRate ?? 0;

  const newEndDate = computeSubscriptionEndDate(clientData.subscriptionEndDate);

  await clientRef.set(
    {
      subscriptionStatus: 'active',
      subscriptionEndDate: newEndDate,
      subscriptionPlanName: metadata.planName,
      subscriptionRate: rate,
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
