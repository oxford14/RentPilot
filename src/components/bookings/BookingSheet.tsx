"use client";

import React, { useMemo, useState } from 'react';
import { addDays, startOfDay } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RenterSearchPanel } from '@/components/bookings/RenterSearchPanel';
import { BookingPaymentStep } from '@/components/bookings/BookingPaymentStep';
import { useAppContext } from '@/contexts/AppContext';
import type { PaymentMethod, Tenant, Vehicle } from '@/lib/types';
import {
  calculateBookingTotal,
  countBookingDays,
  findConflictingBooking,
  formatShortDate,
} from '@/lib/vehicle-booking-status';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { CalendarDays, ChevronRight } from 'lucide-react';

type BookingStep = 'renter' | 'schedule' | 'payment';

interface BookingSheetProps {
  vehicle: Vehicle | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BookingSheet({ vehicle, open, onOpenChange }: BookingSheetProps) {
  const { addVehicleBooking, vehicleBookings, tenants } = useAppContext();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [step, setStep] = useState<BookingStep>('renter');
  const [selectedRenter, setSelectedRenter] = useState<Tenant | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dayCount, setDayCount] = useState(1);
  const [downPayment, setDownPayment] = useState<number | undefined>();

  const todayStr = useMemo(() => startOfDay(new Date()).toISOString().split('T')[0], []);

  React.useEffect(() => {
    if (open && vehicle) {
      setStep('renter');
      setSelectedRenter(null);
      setStartDate(todayStr);
      setEndDate(todayStr);
      setDayCount(1);
      setDownPayment(undefined);
    }
  }, [open, vehicle, todayStr]);

  const resolvedRenter = useMemo(() => {
    if (!selectedRenter) return null;
    return tenants.find((t) => t.id === selectedRenter.id) || selectedRenter;
  }, [selectedRenter, tenants]);

  const totalAmount = useMemo(() => {
    if (!vehicle || !startDate || !endDate) return 0;
    return calculateBookingTotal(vehicle.dailyRate, startDate, endDate);
  }, [vehicle, startDate, endDate]);

  const isAdvanceBooking = useMemo(() => {
    if (!startDate) return false;
    return startDate > todayStr;
  }, [startDate, todayStr]);

  const handleDayCountChange = (days: number) => {
    const safeDays = Math.max(1, days);
    setDayCount(safeDays);
    if (startDate) {
      const start = startOfDay(new Date(`${startDate}T00:00:00.000Z`));
      setEndDate(addDays(start, safeDays - 1).toISOString().split('T')[0]);
    }
  };

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    if (value) {
      const start = startOfDay(new Date(`${value}T00:00:00.000Z`));
      setEndDate(addDays(start, dayCount - 1).toISOString().split('T')[0]);
    }
  };

  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    if (startDate && value) {
      setDayCount(countBookingDays(startDate, value));
    }
  };

  const validateSchedule = (): boolean => {
    if (!vehicle || !startDate || !endDate) {
      toast({ variant: 'destructive', title: 'Select dates', description: 'Start and end dates are required.' });
      return false;
    }
    if (vehicle.status === 'Maintenance') {
      toast({ variant: 'destructive', title: 'Unavailable', description: 'This vehicle is under maintenance.' });
      return false;
    }
    if (endDate < startDate) {
      toast({ variant: 'destructive', title: 'Invalid dates', description: 'End date must be on or after start date.' });
      return false;
    }
    const conflict = findConflictingBooking(vehicle.id, startDate, endDate, vehicleBookings);
    if (conflict) {
      toast({
        variant: 'destructive',
        title: 'Dates unavailable',
        description: `This vehicle is booked ${formatShortDate(conflict.startDate)} – ${formatShortDate(conflict.endDate)}.`,
      });
      return false;
    }
    return true;
  };

  const handleConfirmPayment = async (payment: {
    amount: number;
    paymentMethod: PaymentMethod;
    discountApplied?: number;
    discountDescription?: string;
  }) => {
    if (!vehicle || !resolvedRenter?.id || resolvedRenter.id === 'new') {
      toast({ variant: 'destructive', title: 'Select a renter', description: 'Please choose or create a renter first.' });
      return;
    }

    const startIso = new Date(`${startDate}T00:00:00.000Z`).toISOString();
    const endIso = new Date(`${endDate}T00:00:00.000Z`).toISOString();

    const result = await addVehicleBooking(
      {
        renterId: resolvedRenter.id,
        vehicleId: vehicle.id,
        startDate: startIso,
        endDate: endIso,
        dailyRate: vehicle.dailyRate,
        totalAmount,
        downPayment: isAdvanceBooking ? downPayment : undefined,
      },
      payment.amount > 0
        ? {
            amount: payment.amount,
            paymentMethod: payment.paymentMethod,
            discountApplied: payment.discountApplied,
            discountDescription: payment.discountDescription,
          }
        : undefined
    );

    if (result.success) {
      toast({
        title: isAdvanceBooking ? 'Advance booking saved' : 'Booking confirmed',
        description: `${vehicle.make} ${vehicle.model} · ${formatShortDate(startIso)} – ${formatShortDate(endIso)}`,
      });
      onOpenChange(false);
    } else {
      toast({ variant: 'destructive', title: 'Booking failed', description: result.message });
    }
  };

  if (!vehicle) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={isMobile ? 'h-[92vh] rounded-t-2xl' : 'sm:max-w-lg w-full overflow-y-auto'}
      >
        <SheetHeader>
          <SheetTitle className="font-headline">
            Book {vehicle.year} {vehicle.make} {vehicle.model}
          </SheetTitle>
          <SheetDescription>
            {vehicle.plateNumber} · ₱{vehicle.dailyRate.toLocaleString()}/day
          </SheetDescription>
        </SheetHeader>

        <div className="flex gap-2 py-3">
          {(['renter', 'schedule', 'payment'] as BookingStep[]).map((s, i) => (
            <Badge
              key={s}
              variant={step === s ? 'default' : 'outline'}
              className="capitalize"
            >
              {i + 1}. {s}
            </Badge>
          ))}
        </div>

        <div className="pb-6">
          {step === 'renter' && (
            <div className="space-y-4">
              <RenterSearchPanel
                selectedRenter={resolvedRenter}
                onSelectRenter={setSelectedRenter}
                onRenterCreated={setSelectedRenter}
              />
              <Button
                className="w-full h-11"
                disabled={!resolvedRenter?.id || resolvedRenter.id === 'new'}
                onClick={() => setStep('schedule')}
              >
                Continue to Schedule
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {step === 'schedule' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date">Start date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    min={todayStr}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date">Return date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    min={startDate || todayStr}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="day-count">Number of days</Label>
                <Input
                  id="day-count"
                  type="number"
                  min={1}
                  value={dayCount}
                  onChange={(e) => handleDayCountChange(Number(e.target.value))}
                  className="h-11"
                />
              </div>

              <div className="rounded-lg border bg-muted/30 p-4 flex items-center gap-3">
                <CalendarDays className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Estimated total</p>
                  <p className="text-xl font-bold">
                    ₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {dayCount} day{dayCount !== 1 ? 's' : ''} × ₱{vehicle.dailyRate.toLocaleString()}
                  </p>
                </div>
              </div>

              {isAdvanceBooking && (
                <p className="text-sm text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                  Advance booking — you can collect an optional down payment on the next step.
                </p>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 h-11" onClick={() => setStep('renter')}>
                  Back
                </Button>
                <Button
                  className="flex-1 h-11"
                  onClick={() => {
                    if (validateSchedule()) setStep('payment');
                  }}
                >
                  Continue to Payment
                </Button>
              </div>
            </div>
          )}

          {step === 'payment' && (
            <BookingPaymentStep
              totalAmount={totalAmount}
              isAdvanceBooking={isAdvanceBooking}
              downPayment={downPayment}
              onDownPaymentChange={setDownPayment}
              onConfirm={handleConfirmPayment}
              onBack={() => setStep('schedule')}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
