import { isPast, differenceInDays, startOfDay, addMonths } from 'date-fns';
import type { Client } from '@/lib/types';

export type SubscriptionStatus = 'Active' | 'Expired' | 'Expiring Soon' | 'Inactive';

/** Days before due date when renewal checkout is allowed */
export const RENEWAL_WINDOW_DAYS = 3;

/** Days before due date shown as "Expiring Soon" in UI */
export const EXPIRING_SOON_DAYS = RENEWAL_WINDOW_DAYS;

export function daysUntilSubscriptionEnd(subscriptionEndDate?: string | null): number | null {
  if (!subscriptionEndDate) return null;
  return differenceInDays(new Date(subscriptionEndDate), new Date());
}

export function getClientSubscriptionStatus(client: Client): SubscriptionStatus {
  if (client.subscriptionStatus === 'inactive') return 'Inactive';
  if (!client.subscriptionEndDate) return 'Active';
  const endDate = new Date(client.subscriptionEndDate);
  if (isPast(endDate)) return 'Expired';
  const daysUntilExpiry = daysUntilSubscriptionEnd(client.subscriptionEndDate);
  if (daysUntilExpiry !== null && daysUntilExpiry <= EXPIRING_SOON_DAYS) {
    return 'Expiring Soon';
  }
  return 'Active';
}

/**
 * Renewal is allowed when the subscription is expired or within RENEWAL_WINDOW_DAYS of the due date.
 */
export function canRenewSubscription(client: Pick<Client, 'subscriptionStatus' | 'subscriptionEndDate'>): boolean {
  if (client.subscriptionStatus === 'inactive') return false;
  if (!client.subscriptionEndDate) return false;
  const daysLeft = daysUntilSubscriptionEnd(client.subscriptionEndDate);
  if (daysLeft === null) return false;
  return daysLeft <= RENEWAL_WINDOW_DAYS;
}

/**
 * Extend subscription by one month from the current due date (not from payment date).
 */
export function computeSubscriptionEndDate(currentEndDate?: string | null): string {
  if (currentEndDate) {
    const dueDate = startOfDay(new Date(currentEndDate));
    return addMonths(dueDate, 1).toISOString();
  }
  return addMonths(startOfDay(new Date()), 1).toISOString();
}
