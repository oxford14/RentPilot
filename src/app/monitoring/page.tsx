
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { MonitoredTenant } from '@/lib/types';
import { calculateTenantBalance } from '@/lib/utils';
import { startOfDay, addDays, isSameDay, isBefore, differenceInDays, getDate, getMonth, getYear, lastDayOfMonth, addMonths } from 'date-fns';
import { MonitoringCard } from '@/components/monitoring/MonitoringCard';
import { TenantListItem } from '@/components/monitoring/TenantListItem';
import { BellRing, CalendarX, CalendarClock, CalendarPlus, Info } from 'lucide-react';
import Image from 'next/image';

export default function MonitoringPage() {
  const { tenants, payments } = useAppContext();
  const [categorizedTenants, setCategorizedTenants] = useState<{
    pastDue: MonitoredTenant[];
    dueToday: MonitoredTenant[];
    upcoming: MonitoredTenant[];
  }>({ pastDue: [], dueToday: [], upcoming: [] });
  const [isLoading, setIsLoading] = useState(true);

  const activeTenants = useMemo(() => tenants.filter(t => t.status === 'active'), [tenants]);

  useEffect(() => {
    setIsLoading(true);
    const today = startOfDay(new Date());
    const upcomingLimit = addDays(today, 7);

    const newPastDue: MonitoredTenant[] = [];
    const newDueToday: MonitoredTenant[] = [];
    const newUpcoming: MonitoredTenant[] = [];

    const getAnniversaryForMonth = (tenant: import('@/lib/types').Tenant, dateForMonth: Date): Date => {
        const joinDate = new Date(tenant.joinDate);
        const year = getYear(dateForMonth);
        const month = getMonth(dateForMonth);
        const lastDayInMonth = getDate(lastDayOfMonth(new Date(year, month, 1)));
        const day = Math.min(getDate(joinDate), lastDayInMonth);
        return startOfDay(new Date(year, month, day));
    };

    const findNextDueDate = (tenant: import('@/lib/types').Tenant, fromDate: Date): Date => {
        let anniversary = getAnniversaryForMonth(tenant, fromDate);
        if (isBefore(anniversary, fromDate) || isSameDay(anniversary, fromDate)) {
             anniversary = getAnniversaryForMonth(tenant, addMonths(fromDate, 1));
        }
        return anniversary;
    };
    
    activeTenants.forEach(tenant => {
        const balanceToday = calculateTenantBalance(tenant, payments, today);
        const anniversaryForCurrentMonth = getAnniversaryForMonth(tenant, today);
        
        // If balance is zero or less, they can only be "Upcoming" for the *next* cycle.
        if (balanceToday <= 0) {
            const nextDueDate = findNextDueDate(tenant, today);
            if (isBefore(nextDueDate, upcomingLimit) || isSameDay(nextDueDate, upcomingLimit)) {
                // If paid up, the upcoming balance will be their rent.
                const balanceOnDueDate = tenant.monthlyRentalRate;
                if (balanceOnDueDate > 0) {
                    const daysUntilDue = differenceInDays(nextDueDate, today);
                    // Only show if it's actually in the future.
                    if (daysUntilDue > 0) {
                       newUpcoming.push({ tenant, balance: balanceOnDueDate, daysUntilDue });
                    }
                }
            }
            return; // Finished with this paid-up tenant.
        }

        // From here on, we know balanceToday > 0.

        // Check for Due Today
        if (isSameDay(anniversaryForCurrentMonth, today)) {
            newDueToday.push({ tenant, balance: balanceToday });
            return;
        }
        
        // Check for Past Due
        if (isBefore(anniversaryForCurrentMonth, today)) {
            newPastDue.push({ tenant, balance: balanceToday });
            return;
        }

        // If we reach here, they have a balance, but their due date for this month is in the future.
        // This is an "Upcoming" payment.
        if (isBefore(anniversaryForCurrentMonth, upcomingLimit) || isSameDay(anniversaryForCurrentMonth, upcomingLimit)) {
            const daysUntilDue = differenceInDays(anniversaryForCurrentMonth, today);
            if (daysUntilDue > 0) { // Exclude today since it's handled above
                newUpcoming.push({ tenant, balance: balanceToday, daysUntilDue });
            }
        }
    });

    // Sort the categorized lists
    newPastDue.sort((a, b) => b.balance - a.balance);
    newDueToday.sort((a, b) => b.balance - a.balance);
    newUpcoming.sort((a, b) => (a.daysUntilDue ?? 99) - (b.daysUntilDue ?? 99));

    setCategorizedTenants({ pastDue: newPastDue, dueToday: newDueToday, upcoming: newUpcoming });
    setIsLoading(false);

  }, [activeTenants, payments]);

  return (
    <div className="relative min-h-[calc(100vh-8rem)] w-full flex flex-col items-center justify-center p-4">
      <Image
        src="https://placehold.co/1920x1080.png"
        layout="fill"
        objectFit="cover"
        alt="Background"
        className="-z-10"
        data-ai-hint="abstract background"
      />
      
      <div className="w-full max-w-7xl mx-auto">
        <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-white shadow-lg flex items-center justify-center gap-3">
              <BellRing className="h-10 w-10" />
              Dues Monitoring
            </h1>
            <p className="text-white/80 mt-2 shadow-md">An overview of tenant payment statuses.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MonitoringCard title="Past Due" icon={CalendarX} count={categorizedTenants.pastDue.length}>
              {categorizedTenants.pastDue.length > 0 ? (
                categorizedTenants.pastDue.map(item => (
                  <TenantListItem key={item.tenant.id} tenant={item.tenant} balance={item.balance} />
                ))
              ) : (
                <p className="text-center text-sm text-white/70 p-4">No past due tenants.</p>
              )}
            </MonitoringCard>
            
            <MonitoringCard title="Due Today" icon={CalendarClock} count={categorizedTenants.dueToday.length}>
               {categorizedTenants.dueToday.length > 0 ? (
                categorizedTenants.dueToday.map(item => (
                  <TenantListItem key={item.tenant.id} tenant={item.tenant} balance={item.balance} />
                ))
              ) : (
                <p className="text-center text-sm text-white/70 p-4">No tenants due today.</p>
              )}
            </MonitoringCard>

            <MonitoringCard title="Upcoming Dues" icon={CalendarPlus} count={categorizedTenants.upcoming.length}>
               {categorizedTenants.upcoming.length > 0 ? (
                categorizedTenants.upcoming.map(item => (
                  <TenantListItem key={item.tenant.id} tenant={item.tenant} balance={item.balance} daysUntilDue={item.daysUntilDue} />
                ))
              ) : (
                <p className="text-center text-sm text-white/70 p-4">No upcoming dues in the next 7 days.</p>
              )}
            </MonitoringCard>
        </div>
        <div className="flex items-center justify-center mt-6 p-2 rounded-full bg-black/30 backdrop-blur-sm max-w-md mx-auto">
            <Info className="h-4 w-4 mr-2 text-white/80"/>
            <p className="text-xs text-white/80">Calculations are based on tenant join dates and recorded payments.</p>
        </div>
      </div>
    </div>
  );
}
