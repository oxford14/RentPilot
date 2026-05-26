import { isPast, differenceInDays } from 'date-fns';
import type { Client } from '@/lib/types';

export type SubscriptionStatus = 'Active' | 'Expired' | 'Expiring Soon' | 'Inactive';

export function getClientSubscriptionStatus(client: Client): SubscriptionStatus {
  if (client.subscriptionStatus === 'inactive') return 'Inactive';
  if (!client.subscriptionEndDate) return 'Active';
  const endDate = new Date(client.subscriptionEndDate);
  if (isPast(endDate)) return 'Expired';
  const daysUntilExpiry = differenceInDays(endDate, new Date());
  if (daysUntilExpiry <= 7) return 'Expiring Soon';
  return 'Active';
}
