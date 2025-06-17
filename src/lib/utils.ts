import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Tenant, Payment } from '@/lib/types';
import { startOfDay, getDate, getMonth, getYear, lastDayOfMonth, setDate, isBefore, isSameDay, isAfter } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateTenantBalance(tenant: Tenant, allPayments: Payment[], upToDate: Date): number {
  const normalizedUpToDate = startOfDay(upToDate);
  const joinDate = startOfDay(new Date(tenant.joinDate));

  if (isAfter(joinDate, normalizedUpToDate) && !isSameDay(joinDate, normalizedUpToDate)) {
    // If join date is strictly after upToDate, no amount is billed yet.
    return 0;
  }

  let totalExpectedBilled = 0;

  // Iterate from joinDate to upToDate, adding rent for each billing anniversary passed or on upToDate.
  let currentPeriodStart = new Date(joinDate);
  
  // Account for the very first billing period on joinDate itself if it's on or before upToDate
  if (!isAfter(currentPeriodStart, normalizedUpToDate)) {
    totalExpectedBilled += tenant.monthlyRentalRate;
  }

  // Move to the next potential billing anniversary
  let nextBillingAnniversary = new Date(joinDate);
  nextBillingAnniversary.setMonth(nextBillingAnniversary.getMonth() + 1);
  nextBillingAnniversary = startOfDay(setDate(nextBillingAnniversary, getDate(joinDate))); // Ensure day is correct, then startOfDay

  // Adjust if original join day doesn't exist in next month (e.g. Jan 31 -> Feb)
  if (getMonth(nextBillingAnniversary) !== (getMonth(joinDate) + 1) % 12 && !(getMonth(joinDate) === 11 && getMonth(nextBillingAnniversary) === 0) ) {
     nextBillingAnniversary = lastDayOfMonth(new Date(joinDate.getFullYear(), getMonth(joinDate) + 1, 1));
     nextBillingAnniversary = startOfDay(nextBillingAnniversary);
  }


  while (!isAfter(nextBillingAnniversary, normalizedUpToDate)) {
    totalExpectedBilled += tenant.monthlyRentalRate;
    
    const currentAnniversaryMonth = getMonth(nextBillingAnniversary);
    const currentAnniversaryYear = getYear(nextBillingAnniversary);

    nextBillingAnniversary.setMonth(nextBillingAnniversary.getMonth() + 1);
    // Reset day to original join day, then normalize
    nextBillingAnniversary = setDate(nextBillingAnniversary, getDate(joinDate));
     // Adjust if original join day doesn't exist in new next month
    if (getMonth(nextBillingAnniversary) !== (currentAnniversaryMonth + 1) % 12 && !(currentAnniversaryMonth === 11 && getMonth(nextBillingAnniversary) === 0)) {
      nextBillingAnniversary = lastDayOfMonth(new Date(currentAnniversaryYear, currentAnniversaryMonth + 1, 1));
    }
    nextBillingAnniversary = startOfDay(nextBillingAnniversary);
  }
  
  const tenantPayments = allPayments.filter(p => {
    const paymentDate = startOfDay(new Date(p.date));
    return p.tenantId === tenant.id && !isAfter(paymentDate, normalizedUpToDate);
  });
  const totalPaid = tenantPayments.reduce((sum, p) => sum + p.amount, 0);
  
  return totalExpectedBilled - totalPaid;
}


export const isTenantCurrentlyDueForRent = (
  tenant: Tenant,
  allPayments: Payment[],
  currentDate: Date // Assumed to be startOfDay from client
): boolean => {
  if (tenant.status !== 'active') {
    return false;
  }

  const normalizedCurrentDate = currentDate; // Already startOfDay
  const joinDateOriginal = new Date(tenant.joinDate);
  
  const dueDayOfMonthBasedOnJoin = getDate(joinDateOriginal);
  const daysInCurrentMonth = getDate(lastDayOfMonth(normalizedCurrentDate));
  const effectiveDueDayThisMonth = Math.min(dueDayOfMonthBasedOnJoin, daysInCurrentMonth);

  // Check 1: Is today the tenant's scheduled rent payment day?
  if (getDate(normalizedCurrentDate) !== effectiveDueDayThisMonth) {
    return false; 
  }

  // Check 2: If today is their due day, do they have a positive balance?
  const balance = calculateTenantBalance(tenant, allPayments, normalizedCurrentDate);
  
  return balance > 0; 
};