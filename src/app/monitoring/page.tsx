
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { MonitoredTenant } from '@/lib/types';
import { calculateTenantBalance } from '@/lib/utils';
import { startOfDay, addDays, isSameDay, isBefore, differenceInDays, getYear, getMonth, lastDayOfMonth, getDate, addMonths, isAfter } from 'date-fns';
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
    const upcomingLimit = addDays(today, 8); // Look 7 days into the future

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
    
    activeTenants.forEach(tenant => {
        const balanceToday = calculateTenantBalance(tenant, payments, today);
        const anniversaryForCurrentMonth = getAnniversaryForMonth(tenant, today);
        
        if (balanceToday > 0) {
            // Tenant has an outstanding balance.
            
            // Check if this month's due date has already passed.
            if (isBefore(anniversaryForCurrentMonth, today)) {
                newPastDue.push({ tenant, balance: balanceToday });
                return;
            }

            // Check if this month's due date is today.
            if (isSameDay(anniversaryForCurrentMonth, today)) {
                newDueToday.push({ tenant, balance: balanceToday });
                return;
            }

            // If we are here, the due date is in the future. Check if it's upcoming.
            const daysUntilDue = differenceInDays(anniversaryForCurrentMonth, today);
            if (daysUntilDue > 0 && isBefore(anniversaryForCurrentMonth, upcomingLimit)) {
                newUpcoming.push({ tenant, balance: balanceToday, daysUntilDue });
            }

        } else {
            // Tenant is paid up. Check for their *next* due date to see if they are upcoming.
            let nextDueDate = anniversaryForCurrentMonth;

            // If this month's due date is today or in the past, the next one is next month.
            if (!isAfter(nextDueDate, today)) {
                nextDueDate = getAnniversaryForMonth(tenant, addMonths(today, 1));
            }
            
            const daysUntilDue = differenceInDays(nextDueDate, today);

            // Show if it's within the upcoming window and actually in the future.
            if (daysUntilDue > 0 && isBefore(nextDueDate, upcomingLimit)) {
                // For paid-up tenants, the upcoming "balance" is their standard rent.
                newUpcoming.push({ tenant, balance: tenant.monthlyRentalRate, daysUntilDue });
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
