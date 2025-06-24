
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Tenant, Payment } from '@/lib/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// All dates here are treated as UTC dates at midnight
export function calculateTenantBalance(tenant: Tenant, allPayments: Payment[], upToDate: Date): number {
  const normalizedUpToDate = new Date(Date.UTC(upToDate.getUTCFullYear(), upToDate.getUTCMonth(), upToDate.getUTCDate()));
  const joinDate = new Date(tenant.joinDate);

  if (joinDate > normalizedUpToDate) {
    return 0;
  }

  let monthsBilled = 0;
  let cursorYear = joinDate.getUTCFullYear();
  let cursorMonth = joinDate.getUTCMonth();
  const joinDay = joinDate.getUTCDate();

  while (true) {
    const lastDayOfCursorMonth = new Date(Date.UTC(cursorYear, cursorMonth + 1, 0)).getUTCDate();
    const anniversaryDay = Math.min(joinDay, lastDayOfCursorMonth);
    const anniversaryDate = new Date(Date.UTC(cursorYear, cursorMonth, anniversaryDay));

    if (anniversaryDate > normalizedUpToDate) {
      break;
    }
    
    monthsBilled++;
    
    cursorMonth++;
    if (cursorMonth > 11) {
      cursorMonth = 0;
      cursorYear++;
    }
  }

  const totalExpectedBilled = monthsBilled * tenant.monthlyRentalRate;

  const tenantPaymentsMade = allPayments.filter(p => {
    const paymentDate = new Date(p.date);
    return p.tenantId === tenant.id && paymentDate <= normalizedUpToDate;
  });

  const totalCreditedToTenant = tenantPaymentsMade.reduce((sum, p) => {
    const paymentAmount = Number(p.amount || 0);
    const discountAmount = Number(p.discountApplied || 0);
    return sum + paymentAmount + discountAmount;
  }, 0);
  
  return totalExpectedBilled - totalCreditedToTenant;
}


export const isTenantCurrentlyDueForRent = (
  tenant: Tenant,
  allPayments: Payment[],
  currentDate: Date // Assumed to be UTC from caller
): boolean => {
  if (tenant.status !== 'active') {
    return false;
  }

  const joinDate = new Date(tenant.joinDate);
  const dueDayOfMonthBasedOnJoin = joinDate.getUTCDate();
  
  const lastDayOfCurrentMonth = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth() + 1, 0)).getUTCDate();
  const effectiveDueDayThisMonth = Math.min(dueDayOfMonthBasedOnJoin, lastDayOfCurrentMonth);

  // Check if today is the anniversary day
  if (currentDate.getUTCDate() !== effectiveDueDayThisMonth) {
    return false;
  }

  // To be "due", they must have a positive balance.
  const balance = calculateTenantBalance(tenant, allPayments, currentDate);
  return balance > 0;
};
