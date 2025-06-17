import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Tenant, Payment } from '@/lib/types';
import { startOfDay, getDate, lastDayOfMonth, setDate, isBefore, isSameDay } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const isTenantCurrentlyDueForRent = (
  tenant: Tenant,
  allPayments: Payment[],
  currentDate: Date 
): boolean => {
  if (tenant.status !== 'active') {
    return false;
  }

  const normalizedCurrentDate = startOfDay(currentDate);
  const joinDate = startOfDay(new Date(tenant.joinDate));
  const dueDayOfMonthBasedOnJoin = getDate(joinDate);

  const daysInCurrentMonth = getDate(lastDayOfMonth(normalizedCurrentDate));
  const effectiveDueDayThisMonth = Math.min(dueDayOfMonthBasedOnJoin, daysInCurrentMonth);

  if (getDate(normalizedCurrentDate) !== effectiveDueDayThisMonth) {
    return false; 
  }

  const cycleStartDateForPaymentCheck = normalizedCurrentDate; 

  const hasPaidForCurrentCycle = allPayments.some(p => {
    if (p.tenantId !== tenant.id) return false;
    const paymentDate = startOfDay(new Date(p.date));
    return !isBefore(paymentDate, cycleStartDateForPaymentCheck) && p.amount >= tenant.monthlyRentalRate;
  });

  return !hasPaidForCurrentCycle; 
};