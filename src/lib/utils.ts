

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

  // --- Calculate total rent billed ---
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

  // --- Calculate total credits from payments ---
  const tenantPaymentsMade = allPayments.filter(p => {
    const paymentDate = new Date(p.date);
    // CRITICAL CHANGE: Exclude 'Security Deposit' payments from the rent balance calculation.
    return p.tenantId === tenant.id && paymentDate < boundaryDate && p.paymentMethod !== 'Security Deposit';
  });
  const totalCreditedToTenant = tenantPaymentsMade.reduce((sum, p) => {
    const paymentAmount = Number(p.amount || 0);
    const discountAmount = Number(p.discountApplied || 0);
    return sum + paymentAmount + discountAmount;
  }, 0);
  
  // --- Calculate raw balance from rent vs payments ---
  const rentBalanceRaw = totalExpectedBilled - totalCreditedToTenant;
  
  // --- Get all unpaid dues from DB that are within the timeframe ---
  const allUnpaidDuesInDB = allDues.filter(due => {
    const dueDate = new Date(due.dueDate);
    return due.tenantId === tenant.id && due.status === 'unpaid' && dueDate < boundaryDate;
  });
  
  // --- Final Total Balance Calculation (this is the source of truth) ---
  const totalUnpaidDuesAmountInDB = allUnpaidDuesInDB.reduce((sum, due) => sum + due.amount, 0);
  const totalBalance = rentBalanceRaw + totalUnpaidDuesAmountInDB;

  // --- Now, create the breakdown based on the totalBalance ---
  
  // If no balance or there's a credit, the breakdown is simple
  if (totalBalance <= 0) {
    return {
      rentDue: 0,
      unpaidDues: [],
      creditBalance: Math.abs(totalBalance),
      total: totalBalance,
    };
  }

  // If there IS a balance, determine what it's comprised of for the breakdown.
  const rentDueForBreakdown = Math.max(0, rentBalanceRaw);
  let creditFromRentOverpayment = Math.max(0, -rentBalanceRaw);

  const duesForBreakdown: AdditionalDue[] = [];
  // Sort oldest dues first to pay them off first with credit
  const sortedDues = allUnpaidDuesInDB.sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  for (const due of sortedDues) {
    if (creditFromRentOverpayment >= due.amount) {
      creditFromRentOverpayment -= due.amount; // This due is considered 'paid' by the rent credit for breakdown purposes
    } else {
      duesForBreakdown.push(due); // This due is not covered and should be displayed
    }
  }

  return {
    rentDue: rentDueForBreakdown,
    unpaidDues: duesForBreakdown,
    creditBalance: 0, // There can't be a credit if totalBalance is positive
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
