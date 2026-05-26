import { getAdminDb } from '@/lib/firebase-admin';
import { isPast } from 'date-fns';

/**
 * True when the client subscription is active with a future end date
 * (e.g. webhook already extended before the browser confirm step).
 */
export async function isClientSubscriptionActive(clientId: string): Promise<boolean> {
  const snap = await getAdminDb().collection('clients').doc(clientId).get();
  if (!snap.exists) return false;

  const data = snap.data()!;
  if (data.subscriptionStatus !== 'active') return false;
  if (!data.subscriptionEndDate) return true;

  return !isPast(new Date(data.subscriptionEndDate));
}
