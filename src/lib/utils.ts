

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Tenant, Payment, AdditionalDue } from '@/lib/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// All dates here are treated as UTC dates at midnight
export function calculateTenantBalance(tenant: Tenant, allPayments: Payment[], allDues: AdditionalDue[], upToDate: Date): number {
  // `upToDate` is the last day to be included. So we set our boundary to be the start of the *next* day in UTC.
  const boundaryDate = new Date(Date.UTC(upToDate.getUTCFullYear(), upToDate.getUTCMonth(), upToDate.getUTCDate() + 1));
  
  const joinDate = new Date(tenant.joinDate);

  // If tenant joins on or after the boundary, they owe nothing for this period.
  if (joinDate >= boundaryDate) {
    return 0;
  }

  // --- Billing Calculation ---
  let monthsBilled = 0;
  let cursorYear = joinDate.getUTCFullYear();
  let cursorMonth = joinDate.getUTCMonth();
  const joinDay = joinDate.getUTCDate();

  while (true) {
    const lastDayOfCursorMonth = new Date(Date.UTC(cursorYear, cursorMonth + 1, 0)).getUTCDate();
    const anniversaryDay = Math.min(joinDay, lastDayOfCursorMonth);
    const anniversaryDate = new Date(Date.UTC(cursorYear, cursorMonth, anniversaryDay));

    // We bill if the anniversary date is BEFORE our boundary date (i.e., on or before upToDate).
    if (anniversaryDate >= boundaryDate) {
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

  // --- Payment Calculation ---
  const tenantPaymentsMade = allPayments.filter(p => {
    const paymentDate = new Date(p.date); // p.date is ISO string, so this creates a UTC date object.
    // We include payments made strictly BEFORE our boundary date.
    return p.tenantId === tenant.id && paymentDate < boundaryDate;
  });

  const totalCreditedToTenant = tenantPaymentsMade.reduce((sum, p) => {
    const paymentAmount = Number(p.amount || 0);
    const discountAmount = Number(p.discountApplied || 0);
    return sum + paymentAmount + discountAmount;
  }, 0);
  
  const rentBalance = totalExpectedBilled - totalCreditedToTenant;

  // --- Additional Dues Calculation ---
  const totalUnpaidDues = allDues
    .filter(due => {
      const dueDate = new Date(due.dueDate); // due.dueDate is ISO string, parsed as UTC.
      return due.tenantId === tenant.id && due.status === 'unpaid' && dueDate < boundaryDate;
    })
    .reduce((sum, due) => sum + due.amount, 0);

  return rentBalance + totalUnpaidDues;
}


export const isTenantCurrentlyDueForRent = (
  tenant: Tenant,
  allPayments: Payment[],
  allDues: AdditionalDue[],
  currentDate: Date // Assumed to be UTC start of day from caller
): boolean => {
  if (tenant.status !== 'active') {
    return false;
  }

  // Ensure we are working with a clean UTC date, just in case.
  const currentUTCDate = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate()));
  const joinDate = new Date(tenant.joinDate);
  const dueDayOfMonthBasedOnJoin = joinDate.getUTCDate();
  
  const lastDayOfCurrentMonth = new Date(Date.UTC(currentUTCDate.getUTCFullYear(), currentUTCDate.getUTCMonth() + 1, 0)).getUTCDate();
  const effectiveDueDayThisMonth = Math.min(dueDayOfMonthBasedOnJoin, lastDayOfCurrentMonth);

  // Check if today is the anniversary day
  if (currentUTCDate.getUTCDate() !== effectiveDueDayThisMonth) {
    return false;
  }

  // To be "due", they must have a positive balance.
  // This now calls the fixed calculation logic.
  const balance = calculateTenantBalance(tenant, allPayments, allDues, currentUTCDate);
  return balance > 0;
};
