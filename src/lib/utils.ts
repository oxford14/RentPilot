

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Tenant, Payment, AdditionalDue, BalanceBreakdown } from '@/lib/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// All dates here are treated as UTC dates at midnight
export function calculateTenantBalanceBreakdown(tenant: Tenant, allPayments: Payment[], allDues: AdditionalDue[], upToDate: Date): BalanceBreakdown {
  const boundaryDate = new Date(Date.UTC(upToDate.getUTCFullYear(), upToDate.getUTCMonth(), upToDate.getUTCDate() + 1));
  const joinDate = new Date(tenant.joinDate);

  if (joinDate >= boundaryDate) {
    return { rentDue: 0, unpaidDues: [], total: 0 };
  }

  let monthsBilled = 0;
  let cursorYear = joinDate.getUTCFullYear();
  let cursorMonth = joinDate.getUTCMonth();
  const joinDay = joinDate.getUTCDate();

  while (true) {
    const lastDayOfCursorMonth = new Date(Date.UTC(cursorYear, cursorMonth + 1, 0)).getUTCDate();
    const anniversaryDay = Math.min(joinDay, lastDayOfCursorMonth);
    const anniversaryDate = new Date(Date.UTC(cursorYear, cursorMonth, anniversaryDay));

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

  const tenantPaymentsMade = allPayments.filter(p => {
    const paymentDate = new Date(p.date);
    return p.tenantId === tenant.id && paymentDate < boundaryDate;
  });

  const totalCreditedToTenant = tenantPaymentsMade.reduce((sum, p) => {
    const paymentAmount = Number(p.amount || 0);
    const discountAmount = Number(p.discountApplied || 0);
    return sum + paymentAmount + discountAmount;
  }, 0);
  
  const rentBalance = totalExpectedBilled - totalCreditedToTenant;

  const unpaidAdditionalDues = allDues.filter(due => {
    const dueDate = new Date(due.dueDate);
    return due.tenantId === tenant.id && due.status === 'unpaid' && dueDate < boundaryDate;
  });

  const totalUnpaidDuesAmount = unpaidAdditionalDues.reduce((sum, due) => sum + due.amount, 0);
  
  const totalBalance = rentBalance + totalUnpaidDuesAmount;

  return {
    rentDue: rentBalance,
    unpaidDues: unpaidAdditionalDues,
    total: totalBalance,
  };
}

export function calculateTenantBalance(tenant: Tenant, allPayments: Payment[], allDues: AdditionalDue[], upToDate: Date): number {
  const breakdown = calculateTenantBalanceBreakdown(tenant, allPayments, allDues, upToDate);
  return breakdown.total;
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

  const currentUTCDate = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate()));
  const joinDate = new Date(tenant.joinDate);
  const dueDayOfMonthBasedOnJoin = joinDate.getUTCDate();
  
  const lastDayOfCurrentMonth = new Date(Date.UTC(currentUTCDate.getUTCFullYear(), currentUTCDate.getUTCMonth() + 1, 0)).getUTCDate();
  const effectiveDueDayThisMonth = Math.min(dueDayOfMonthBasedOnJoin, lastDayOfCurrentMonth);

  if (currentUTCDate.getUTCDate() !== effectiveDueDayThisMonth) {
    return false;
  }

  const balance = calculateTenantBalance(tenant, allPayments, allDues, currentUTCDate);
  return balance > 0;
};
