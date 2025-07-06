

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
  const dueDay = tenant.monthlyDueDay || joinDate.getUTCDate();

  // --- Step 1: Calculate total credits first, regardless of join date ---
  const totalCreditsFromPayments = allPayments
    .filter(p => p.tenantId === tenant.id && new Date(p.date) < boundaryDate && p.paymentMethod !== 'Security Deposit')
    .reduce((sum, p) => sum + (p.amount || 0) + (p.discountApplied || 0), 0);

  const totalCreditsFromDues = allDues
    .filter(d => d.tenantId === tenant.id && new Date(d.dueDate) < boundaryDate)
    .reduce((sum, d) => sum + (d.creditApplied || 0), 0);
    
  const totalCredits = totalCreditsFromPayments + totalCreditsFromDues;

  // --- Step 2: Generate all liabilities (charges) chronologically ---
  const allCharges: { date: Date; type: string; amount: number; original: any }[] = [];

  // Only calculate rent if the join date is in the past, otherwise no rent is due yet.
  if (joinDate < boundaryDate) {
    if (tenant.rent_history && tenant.rent_history.length > 0) {
      let chargeDate = new Date(joinDate);

      while (chargeDate < boundaryDate) {
        const activeRentEntry = [...tenant.rent_history]
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
            .find(entry => {
                const entryStart = new Date(entry.startDate);
                const entryEnd = entry.endDate ? new Date(entry.endDate) : null;
                // A charge is valid if the chargeDate is on or after the entry start,
                // and before the entry end (if it exists)
                return chargeDate >= entryStart && (!entryEnd || chargeDate < entryEnd);
            });
        
        const rateForMonth = activeRentEntry ? activeRentEntry.rate : 0;
        if (rateForMonth > 0) {
          allCharges.push({
            date: new Date(chargeDate),
            type: 'Rent',
            amount: rateForMonth,
            original: { month: chargeDate.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }), rate: rateForMonth }
          });
        }

        // Advance to the next due date
        const currentMonth = chargeDate.getUTCMonth();
        const currentYear = chargeDate.getUTCFullYear();
        
        let nextMonth = currentMonth + 1;
        let nextYear = currentYear;
        
        if (nextMonth > 11) {
          nextMonth = 0;
          nextYear++;
        }
        
        const lastDayOfNextMonth = new Date(Date.UTC(nextYear, nextMonth + 1, 0)).getUTCDate();
        const nextDueDayInMonth = Math.min(dueDay, lastDayOfNextMonth);
        
        chargeDate = new Date(Date.UTC(nextYear, nextMonth, nextDueDayInMonth));
      }
    }
  }

  // Add additional dues liabilities
  allDues.filter(d => d.tenantId === tenant.id && new Date(d.dueDate) < boundaryDate).forEach(due => {
    allCharges.push({ date: new Date(due.dueDate), type: 'Due', amount: due.amount, original: due });
  });

  // Sort all charges by date, oldest first
  allCharges.sort((a, b) => a.date.getTime() - b.date.getTime());
  
  // --- Step 3: Calculate net balance ---
  const totalLiability = allCharges.reduce((sum, charge) => sum + charge.amount, 0);
  const totalBalance = totalLiability - totalCredits;

  if (totalBalance <= 0) {
    return { rentDue: 0, rentDueDetails: [], unpaidDues: [], creditBalance: Math.abs(totalBalance), total: totalBalance };
  }

  // --- Step 4: Determine unpaid charges by working backwards (LIFO on liability) ---
  let balanceToAccountFor = totalBalance;
  const unpaidRentDetails: { month: string; rate: number }[] = [];
  const unpaidDues: AdditionalDue[] = [];

  const reversedCharges = allCharges.slice().reverse();

  for (const charge of reversedCharges) {
      if (balanceToAccountFor <= 0) break;

      const amountToAttribute = Math.min(charge.amount, balanceToAccountFor);
      
      if (charge.type === 'Rent') {
          unpaidRentDetails.unshift({ ...charge.original, rate: amountToAttribute });
      } else if (charge.type === 'Due') {
          unpaidDues.unshift({ ...charge.original, amount: amountToAttribute });
      }

      balanceToAccountFor -= amountToAttribute;
  }
  
  const finalRentDue = unpaidRentDetails.reduce((sum, r) => sum + r.rate, 0);

  return {
    rentDue: finalRentDue,
    rentDueDetails: unpaidRentDetails,
    unpaidDues: unpaidDues.map(due => ({...due, amount: due.amount - (due.creditApplied || 0)})).filter(due => due.amount > 0),
    creditBalance: 0,
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
  const dueDayOfMonth = tenant.monthlyDueDay || joinDate.getUTCDate();
  
  const lastDayOfCurrentMonth = new Date(Date.UTC(currentUTCDate.getUTCFullYear(), currentUTCDate.getUTCMonth() + 1, 0)).getUTCDate();
  const effectiveDueDayThisMonth = Math.min(dueDayOfMonth, lastDayOfCurrentMonth);

  if (currentUTCDate.getUTCDate() !== effectiveDueDayThisMonth) {
    return false;
  }

  const balance = calculateTenantBalance(tenant, allPayments, allDues, currentUTCDate);
  return balance > 0;
};
