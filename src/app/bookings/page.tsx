"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppContext } from '@/contexts/AppContext';
import { VehicleBookingGrid } from '@/components/bookings/VehicleBookingGrid';
import { BookingSheet } from '@/components/bookings/BookingSheet';
import type { Vehicle } from '@/lib/types';
import { CalendarCheck } from 'lucide-react';

export default function BookingsPage() {
  const { activeClient } = useAppContext();
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  if (activeClient && activeClient.businessType !== 'Vehicle_Rental') {
    return (
      <div className="container mx-auto py-12 text-center">
        <Card className="max-w-md mx-auto shadow-xl">
          <CardHeader>
            <CardTitle>Feature Unavailable</CardTitle>
            <CardDescription>
              Booking is exclusive to Vehicle Rental businesses.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleSelectVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setSheetOpen(true);
  };

  return (
    <div className="container mx-auto py-2 space-y-6 pb-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-headline flex items-center gap-2">
          <CalendarCheck className="h-7 w-7 text-primary shrink-0" />
          Booking
        </h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Select a vehicle, choose a renter, schedule dates, and collect payment.
        </p>
      </div>

      <Card className="shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-headline">Fleet Units</CardTitle>
          <CardDescription>
            Tap a unit to start a booking. Reserved and rented units show when they become available.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VehicleBookingGrid onSelectVehicle={handleSelectVehicle} />
        </CardContent>
      </Card>

      <BookingSheet
        vehicle={selectedVehicle}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
