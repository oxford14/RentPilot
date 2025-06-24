"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { MonitoredTenant } from '@/lib/types';
import { calculateTenantBalance } from '@/lib/utils';
import { MonitoringCard } from '@/components/monitoring/MonitoringCard';
import { TenantListItem } from '@/components/monitoring/TenantListItem';
import { BellRing, CalendarX, CalendarClock, CalendarPlus, Info } from 'lucide-react';
import Image from 'next/image';

export default function MonitoringPage() {
  const { tenants, payments, systemTimezone } = useAppContext();
  const [categorizedTenants, setCategorizedTenants] = useState<{
    pastDue: MonitoredTenant[];
    dueToday: MonitoredTenant[];
    upcoming: MonitoredTenant[];
  }>({ pastDue: [], dueToday: [], upcoming: [] });
  const [isLoading, setIsLoading] = useState(true);

  const activeTenants = useMemo(() => tenants.filter(t => t.status === 'active'), [tenants]);

  useEffect(() => {
    setIsLoading(true);

    const now = new Date();
    const timeZone = systemTimezone || 'Etc/UTC';

    // Use Intl.DateTimeFormat to reliably get date parts in the target timezone
    const dateParts = new Intl.DateTimeFormat('en-CA', {
        year: 'numeric', month: '2-digit', day: '2-digit', timeZone,
    }).formatToParts(now).reduce((acc, part) => {
        if (part.type !== 'literal') {
            (acc as any)[part.type] = parseInt(part.value);
        }
        return acc;
    }, {} as Record<string, number>);
    
    // today is midnight UTC for the given timezone's current date
    const today = new Date(Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day));

    const upcomingLimit = new Date(today.getTime());
    upcomingLimit.setUTCDate(today.getUTCDate() + 8); // Look 7 days into the future

    const newPastDue: MonitoredTenant[] = [];
    const newDueToday: MonitoredTenant[] = [];
    const newUpcoming: MonitoredTenant[] = [];

    const getAnniversaryForMonth = (tenant: import('@/lib/types').Tenant, refDate: Date): Date => {
        const joinDate = new Date(tenant.joinDate);
        const joinDay = joinDate.getUTCDate();
        const refYear = refDate.getUTCFullYear();
        const refMonth = refDate.getUTCMonth();
        
        const lastDayInMonth = new Date(Date.UTC(refYear, refMonth + 1, 0)).getUTCDate();
        const anniversaryDay = Math.min(joinDay, lastDayInMonth);
        
        return new Date(Date.UTC(refYear, refMonth, anniversaryDay));
    };

    activeTenants.forEach(tenant => {
      const balanceToday = calculateTenantBalance(tenant, payments, today);
      
      if (balanceToday <= 0) {
        // Tenant is paid up. Check for their *next* due date.
        let anniversaryThisMonth = getAnniversaryForMonth(tenant, today);
        let nextDueDate;

        if (anniversaryThisMonth > today) {
            nextDueDate = anniversaryThisMonth;
        } else {
            const nextMonthDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
            nextDueDate = getAnniversaryForMonth(tenant, nextMonthDate);
        }
        
        const daysUntilDue = Math.round((nextDueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
        
        if (daysUntilDue > 0 && nextDueDate < upcomingLimit) {
            newUpcoming.push({ tenant, balance: tenant.monthlyRentalRate, daysUntilDue });
        }
        return; // Done with this tenant
      }

      // Tenant has a balance. Find out when it became due.
      const anniversaryThisMonth = getAnniversaryForMonth(tenant, today);

      if (anniversaryThisMonth < today) {
        // Due date for this month has passed.
        newPastDue.push({ tenant, balance: balanceToday });

      } else if (anniversaryThisMonth.getTime() === today.getTime()) {
        // Due date is today.
        newDueToday.push({ tenant, balance: balanceToday });

      } else { // anniversaryThisMonth > today
        // Due date for this month is in the future. Check if it's upcoming.
        const daysUntilDue = Math.round((anniversaryThisMonth.getTime() - today.getTime()) / (1000 * 3600 * 24));
        if (anniversaryThisMonth < upcomingLimit) {
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

  }, [activeTenants, payments, systemTimezone]);

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
        <div className="mb-8 text-center bg-black/40 backdrop-blur-sm p-6 rounded-xl border border-white/20 shadow-lg">
            <h1 className="text-4xl font-bold text-white flex items-center justify-center gap-3">
              <BellRing className="h-10 w-10" />
              Dues Monitoring
            </h1>
            <p className="text-white/90 mt-2">An overview of tenant payment statuses.</p>
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
        <div className="flex items-center justify-center mt-6 p-2 rounded-full bg-black/50 backdrop-blur-sm max-w-md mx-auto">
            <Info className="h-4 w-4 mr-2 text-white/90"/>
            <p className="text-xs text-white/90">Calculations are based on tenant join dates and recorded payments.</p>
        </div>
      </div>
    </div>
  );
}
