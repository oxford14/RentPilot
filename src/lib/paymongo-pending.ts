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
