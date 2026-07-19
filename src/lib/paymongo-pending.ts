import { getAdminDb } from '@/lib/firebase-admin';

const COLLECTION = 'paymongoCheckoutPending';

export type PendingCheckoutRecord = {
  sessionId: string;
  clientId: string;
  billingEndDate?: string;
  createdAt: string;
};

export async function savePendingCheckout(
  paymentRef: string,
  record: Omit<PendingCheckoutRecord, 'createdAt'>
): Promise<void> {
  const db = getAdminDb();
  await db.collection(COLLECTION).doc(paymentRef).set({
    ...record,
    createdAt: new Date().toISOString(),
  });
}

export async function resolvePendingCheckout(
  paymentRef: string,
  expectedClientId?: string
): Promise<PendingCheckoutRecord | null> {
  const db = getAdminDb();
  const snap = await db.collection(COLLECTION).doc(paymentRef).get();
  if (!snap.exists) return null;

  const data = snap.data() as PendingCheckoutRecord;
  if (expectedClientId && data.clientId !== expectedClientId) {
    throw new Error('This payment does not belong to your organization.');
  }
  return data;
}

export async function deletePendingCheckout(paymentRef: string): Promise<void> {
  try {
    await getAdminDb().collection(COLLECTION).doc(paymentRef).delete();
  } catch {
    // non-fatal
  }
}

export type PendingQrRecord = {
  kind: 'qr';
  clientId: string;
  clientName?: string;
  planName: string;
  amount: number;
  billingCycle?: 'monthly' | 'yearly';
  billingEndDate?: string;
  createdAt: string;
};

/** Stores QR subscription metadata keyed by the PayMongo payment intent id. */
export async function saveQrPending(
  intentId: string,
  record: Omit<PendingQrRecord, 'kind' | 'createdAt'>
): Promise<void> {
  const db = getAdminDb();
  await db
    .collection(COLLECTION)
    .doc(intentId)
    .set({
      kind: 'qr',
      ...record,
      createdAt: new Date().toISOString(),
    });
}

export async function resolveQrPending(
  intentId: string,
  expectedClientId?: string
): Promise<PendingQrRecord | null> {
  const db = getAdminDb();
  const snap = await db.collection(COLLECTION).doc(intentId).get();
  if (!snap.exists) return null;

  const data = snap.data() as PendingQrRecord;
  if (data.kind !== 'qr') return null;
  if (expectedClientId && data.clientId !== expectedClientId) {
    throw new Error('This payment does not belong to your organization.');
  }
  return data;
}
