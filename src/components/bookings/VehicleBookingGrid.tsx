"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAppContext } from '@/contexts/AppContext';
import type { Vehicle } from '@/lib/types';
import {
  getVehicleAvailability,
  vehicleDisplayStatusColors,
  formatShortDate,
} from '@/lib/vehicle-booking-status';
import { Car, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VehicleBookingGridProps {
  onSelectVehicle: (vehicle: Vehicle) => void;
}

export function VehicleBookingGrid({ onSelectVehicle }: VehicleBookingGridProps) {
  const { vehicles, vehicleBookings, vehicleCategories } = useAppContext();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const getCategoryName = (categoryId?: string) =>
    vehicleCategories.find((c) => c.id === categoryId)?.name ?? 'Uncategorized';

  const enrichedVehicles = useMemo(() => {
    return vehicles.map((vehicle) => ({
      vehicle,
      availability: getVehicleAvailability(vehicle, vehicleBookings),
    }));
  }, [vehicles, vehicleBookings]);

  const filtered = useMemo(() => {
    let list = enrichedVehicles;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        ({ vehicle }) =>
          vehicle.make.toLowerCase().includes(q) ||
          vehicle.model.toLowerCase().includes(q) ||
          vehicle.plateNumber.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') {
      list = list.filter(({ availability }) => availability.displayStatus === statusFilter);
    }
    return list;
  }, [enrichedVehicles, search, statusFilter]);

  const filters = ['all', 'Available', 'Reserved', 'Rented', 'Maintenance'];

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search vehicles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-11"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setStatusFilter(filter)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium border transition-colors',
              statusFilter === filter
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background hover:bg-muted'
            )}
          >
            {filter === 'all' ? 'All' : filter}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(({ vehicle, availability }) => (
          <button
            key={vehicle.id}
            type="button"
            onClick={() => onSelectVehicle(vehicle)}
            className="text-left"
          >
            <Card className="h-full transition-all hover:shadow-md hover:border-primary/40 active:scale-[0.99]">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                      <Car className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {vehicle.plateNumber} · {getCategoryName(vehicle.categoryId)}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn('shrink-0 text-xs', vehicleDisplayStatusColors[availability.displayStatus])}
                  >
                    {availability.displayStatus}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-lg font-bold text-primary">
                  ₱{vehicle.dailyRate.toLocaleString()}
                  <span className="text-xs font-normal text-muted-foreground">/day</span>
                </p>
                {availability.subtitle && (
                  <p className="text-xs text-muted-foreground leading-snug">{availability.subtitle}</p>
                )}
                {availability.upcomingBooking && (
                  <p className="text-xs text-indigo-700">
                    Advance: {formatShortDate(availability.upcomingBooking.startDate)} –{' '}
                    {formatShortDate(availability.upcomingBooking.endDate)}
                  </p>
                )}
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-12">No vehicles match your search.</p>
      )}
    </div>
  );
}
