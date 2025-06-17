
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
    return 0;
  }

  let totalExpectedBilled = 0;
  let currentPeriodStart = new Date(joinDate);
  
  if (!isAfter(currentPeriodStart, normalizedUpToDate)) {
    totalExpectedBilled += tenant.monthlyRentalRate;
  }

  let nextBillingAnniversary = new Date(joinDate);
  nextBillingAnniversary.setMonth(nextBillingAnniversary.getMonth() + 1);
  nextBillingAnniversary = startOfDay(setDate(nextBillingAnniversary, getDate(joinDate))); 

  if (getMonth(nextBillingAnniversary) !== (getMonth(joinDate) + 1) % 12 && !(getMonth(joinDate) === 11 && getMonth(nextBillingAnniversary) === 0) ) {
     nextBillingAnniversary = lastDayOfMonth(new Date(joinDate.getFullYear(), getMonth(joinDate) + 1, 1));
     nextBillingAnniversary = startOfDay(nextBillingAnniversary);
  }


  while (!isAfter(nextBillingAnniversary, normalizedUpToDate)) {
    totalExpectedBilled += tenant.monthlyRentalRate;
    
    const currentAnniversaryMonth = getMonth(nextBillingAnniversary);
    const currentAnniversaryYear = getYear(nextBillingAnniversary);

    nextBillingAnniversary.setMonth(nextBillingAnniversary.getMonth() + 1);
    nextBillingAnniversary = setDate(nextBillingAnniversary, getDate(joinDate));
    if (getMonth(nextBillingAnniversary) !== (currentAnniversaryMonth + 1) % 12 && !(currentAnniversaryMonth === 11 && getMonth(nextBillingAnniversary) === 0)) {
      nextBillingAnniversary = lastDayOfMonth(new Date(currentAnniversaryYear, currentAnniversaryMonth + 1, 1));
    }
    nextBillingAnniversary = startOfDay(nextBillingAnniversary);
  }
  
  const tenantPaymentsMade = allPayments.filter(p => {
    const paymentDate = startOfDay(new Date(p.date));
    return p.tenantId === tenant.id && !isAfter(paymentDate, normalizedUpToDate);
  });

  const totalCreditedToTenant = tenantPaymentsMade.reduce((sum, p) => sum + p.amount + (p.discountApplied || 0), 0);
  
  return totalExpectedBilled - totalCreditedToTenant;
}


export const isTenantCurrentlyDueForRent = (
  tenant: Tenant,
  allPayments: Payment[],
  currentDate: Date // Assumed to be startOfDay from client
): boolean => {
  if (tenant.status !== 'active') {
    return false;
  }

  const normalizedCurrentDate = currentDate; 
  const joinDateOriginal = new Date(tenant.joinDate);
  
  const dueDayOfMonthBasedOnJoin = getDate(joinDateOriginal);
  const daysInCurrentMonth = getDate(lastDayOfMonth(normalizedCurrentDate));
  const effectiveDueDayThisMonth = Math.min(dueDayOfMonthBasedOnJoin, daysInCurrentMonth);

  if (getDate(normalizedCurrentDate) !== effectiveDueDayThisMonth) {
    return false; 
  }

  const balance = calculateTenantBalance(tenant, allPayments, normalizedCurrentDate);
  
  return balance > 0; 
};
