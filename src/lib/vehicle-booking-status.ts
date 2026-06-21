import { addDays, differenceInCalendarDays, isAfter, isBefore, startOfDay } from 'date-fns';
import type { Vehicle, VehicleAvailabilityInfo, VehicleBooking, VehicleDisplayStatus } from '@/lib/types';

export function parseBookingDate(dateString: string): Date {
  return startOfDay(new Date(dateString));
}

export function countBookingDays(startDate: string, endDate: string): number {
  const start = parseBookingDate(startDate);
  const end = parseBookingDate(endDate);
  return Math.max(1, differenceInCalendarDays(end, start) + 1);
}

export function calculateBookingTotal(dailyRate: number, startDate: string, endDate: string): number {
  return dailyRate * countBookingDays(startDate, endDate);
}

export function dateRangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const aStart = parseBookingDate(startA);
  const aEnd = parseBookingDate(endA);
  const bStart = parseBookingDate(startB);
  const bEnd = parseBookingDate(endB);
  return aStart <= bEnd && bStart <= aEnd;
}

export function isBookingCancelled(booking: VehicleBooking): boolean {
  return booking.status === 'cancelled';
}

export function isBookingCompleted(booking: VehicleBooking, today: Date = startOfDay(new Date())): boolean {
  if (booking.status === 'cancelled') return false;
  if (booking.status === 'completed') return true;
  return isAfter(today, parseBookingDate(booking.endDate));
}

export function isBookingActive(booking: VehicleBooking, today: Date = startOfDay(new Date())): boolean {
  if (isBookingCancelled(booking) || isBookingCompleted(booking, today)) return false;
  const start = parseBookingDate(booking.startDate);
  const end = parseBookingDate(booking.endDate);
  return !isBefore(today, start) && !isAfter(today, end);
}

export function isBookingUpcoming(booking: VehicleBooking, today: Date = startOfDay(new Date())): boolean {
  if (isBookingCancelled(booking) || isBookingCompleted(booking, today)) return false;
  return isBefore(today, parseBookingDate(booking.startDate));
}

export function resolveBookingLifecycleStatus(
  booking: VehicleBooking,
  today: Date = startOfDay(new Date())
): VehicleBooking['status'] {
  if (booking.status === 'cancelled') return 'cancelled';
  if (isBookingCompleted(booking, today)) return 'completed';
  if (isBookingActive(booking, today)) return 'active';
  if (isBookingUpcoming(booking, today)) return 'reserved';
  return booking.status;
}

export function getBookingsForVehicle(
  vehicleId: string,
  bookings: VehicleBooking[]
): VehicleBooking[] {
  return bookings
    .filter((b) => b.vehicleId === vehicleId && b.status !== 'cancelled')
    .sort((a, b) => parseBookingDate(a.startDate).getTime() - parseBookingDate(b.startDate).getTime());
}

export function findConflictingBooking(
  vehicleId: string,
  startDate: string,
  endDate: string,
  bookings: VehicleBooking[],
  excludeBookingId?: string
): VehicleBooking | undefined {
  return bookings.find(
    (booking) =>
      booking.vehicleId === vehicleId &&
      booking.id !== excludeBookingId &&
      booking.status !== 'cancelled' &&
      !isBookingCompleted(booking) &&
      dateRangesOverlap(startDate, endDate, booking.startDate, booking.endDate)
  );
}

export function getVehicleAvailability(
  vehicle: Vehicle,
  bookings: VehicleBooking[],
  today: Date = startOfDay(new Date())
): VehicleAvailabilityInfo {
  if (vehicle.status === 'Maintenance') {
    return { displayStatus: 'Maintenance' };
  }

  const vehicleBookings = getBookingsForVehicle(vehicle.id, bookings).filter(
    (b) => !isBookingCompleted(b, today)
  );

  const activeBooking = vehicleBookings.find((b) => isBookingActive(b, today));
  if (activeBooking) {
    return {
      displayStatus: 'Rented',
      activeBooking,
      subtitle: `Available after ${formatShortDate(activeBooking.endDate)}`,
      availableFrom: addDays(parseBookingDate(activeBooking.endDate), 1).toISOString(),
    };
  }

  const upcomingBooking = vehicleBookings.find((b) => isBookingUpcoming(b, today));
  if (upcomingBooking) {
    return {
      displayStatus: 'Reserved',
      upcomingBooking,
      subtitle: `Reserved ${formatShortDate(upcomingBooking.startDate)} – ${formatShortDate(upcomingBooking.endDate)}`,
      availableFrom: addDays(parseBookingDate(upcomingBooking.endDate), 1).toISOString(),
    };
  }

  const lastEnded = [...getBookingsForVehicle(vehicle.id, bookings)]
    .filter((b) => isBookingCompleted(b, today))
    .sort((a, b) => parseBookingDate(b.endDate).getTime() - parseBookingDate(a.endDate).getTime())[0];

  if (lastEnded) {
    return {
      displayStatus: 'Available',
      subtitle: `Available now (last return ${formatShortDate(lastEnded.endDate)})`,
    };
  }

  return { displayStatus: 'Available' };
}

export function formatShortDate(dateString: string): string {
  return parseBookingDate(dateString).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export const vehicleDisplayStatusColors: Record<VehicleDisplayStatus, string> = {
  Available: 'bg-green-500/20 text-green-700 border-green-400',
  Reserved: 'bg-indigo-500/20 text-indigo-700 border-indigo-400',
  Rented: 'bg-blue-500/20 text-blue-700 border-blue-400',
  Maintenance: 'bg-yellow-500/20 text-yellow-700 border-yellow-400',
};
