

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
    return { rentDue: 0, unpaidDues: [], total: 0, creditBalance: 0 };
  }

  // 1. Calculate total rent liability
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
  const totalRentLiability = monthsBilled * tenant.monthlyRentalRate;

  // 2. Calculate total additional dues liability
  const tenantDues = allDues.filter(d => d.tenantId === tenant.id && new Date(d.createdAt) < boundaryDate);
  const totalDuesLiability = tenantDues.reduce((sum, d) => sum + d.amount, 0);

  // 3. Calculate total credits from real payments, excluding internal credit transfers
  const tenantPayments = allPayments.filter(p => p.tenantId === tenant.id && new Date(p.date) < boundaryDate && p.paymentMethod !== 'Security Deposit' && p.paymentMethod !== 'From Credit');
  const totalCredits = tenantPayments.reduce((sum, p) => sum + (p.amount || 0) + (p.discountApplied || 0), 0);
  
  // 4. Calculate the final, true balance
  const totalLiability = totalRentLiability + totalDuesLiability;
  const totalBalance = totalLiability - totalCredits;

  // 5. Create the user-friendly breakdown
  if (totalBalance <= 0) {
    return { rentDue: 0, unpaidDues: [], creditBalance: Math.abs(totalBalance), total: totalBalance };
  }

  // --- Breakdown for positive balance ---
  const rentDueForBreakdown = Math.max(0, totalRentLiability - totalCredits);
  const creditAfterRent = Math.max(0, totalCredits - totalRentLiability);
  
  const unpaidDuesFromDB = tenantDues.filter(d => d.status === 'unpaid');
  
  let tempCredit = creditAfterRent;
  const finalUnpaidDuesForBreakdown: AdditionalDue[] = [];

  for (const due of unpaidDuesFromDB) {
      if (tempCredit >= due.amount) {
          tempCredit -= due.amount; // This due is considered paid by credit for breakdown purposes
      } else {
          finalUnpaidDuesForBreakdown.push(due);
      }
  }
  
  return {
    rentDue: rentDueForBreakdown,
    unpaidDues: finalUnpaidDuesForBreakdown,
    creditBalance: 0, // Cannot have a credit if totalBalance is positive
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
