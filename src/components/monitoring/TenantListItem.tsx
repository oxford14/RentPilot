
"use client";

import React from 'react';
import { Tenant } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

interface TenantListItemProps {
  tenant: Tenant;
  balance: number;
  daysUntilDue?: number;
}

export function TenantListItem({ tenant, balance, daysUntilDue }: TenantListItemProps) {
  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  return (
    <div className="p-3 rounded-lg bg-black/75 hover:bg-black/85 transition-colors">
      <div className="flex justify-between items-center">
        <p className="font-semibold truncate">{tenant.name}</p>
        {daysUntilDue !== undefined && (
          <Badge variant="outline" className="text-white border-white/50">
            {daysUntilDue > 1 && `${daysUntilDue} days left`}
            {daysUntilDue === 1 && `1 day left`}
            {daysUntilDue === 0 && `Due today`}
          </Badge>
        )}
      </div>
      <div className="text-sm text-white/80 mt-1">
        <span>Amount Due: </span>
        <span className="font-medium text-white">{formatCurrency(balance)}</span>
      </div>
       <div className="text-xs text-white/60 mt-1">
        Monthly Rent: {formatCurrency(tenant.monthlyRentalRate)}
      </div>
    </div>
  );
}
