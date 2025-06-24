
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { CalendarCheck, Check, Clock, ListX } from 'lucide-react';
import type { DemoBooking } from '@/lib/types';

function BookingsTable({ bookings, onMarkAsDone }: { bookings: DemoBooking[], onMarkAsDone: (id: string) => void }) {
  if (bookings.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        <ListX className="mx-auto h-12 w-12 mb-4 text-gray-400" />
        <p className="text-lg">No bookings in this category.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border shadow-sm overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Requested At</TableHead>
            <TableHead>Contact Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Scheduled For</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((booking) => (
            <TableRow key={booking.id} className="hover:bg-muted/50 transition-colors">
              <TableCell>{format(new Date(booking.createdAt), 'PPp')}</TableCell>
              <TableCell className="font-medium">{booking.name}</TableCell>
              <TableCell>{booking.email}</TableCell>
              <TableCell>{booking.phone}</TableCell>
              <TableCell>{format(new Date(booking.scheduled_at), 'PPp')}</TableCell>
              <TableCell className="text-center">
                <Badge variant={booking.status === 'pending' ? 'secondary' : 'default'} className={booking.status === 'pending' ? 'bg-amber-500/20 text-amber-700 border-amber-400' : 'bg-green-500/20 text-green-700 border-green-400'}>
                  {booking.status === 'pending' ? <Clock className="mr-1 h-3 w-3" /> : <Check className="mr-1 h-3 w-3" />}
                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {booking.status === 'pending' && (
                  <Button size="sm" onClick={() => onMarkAsDone(booking.id)}>
                    <Check className="mr-2 h-4 w-4" /> Mark as Done
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function DemoBookingsPage() {
  const { rawDemoBookings, markBookingAsDone } = useAppContext();
  const { toast } = useToast();

  const sortedBookings = useMemo(() => {
    return [...rawDemoBookings].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [rawDemoBookings]);

  const pendingBookings = useMemo(() => {
    return sortedBookings.filter(b => b.status === 'pending');
  }, [sortedBookings]);
  
  const doneBookings = useMemo(() => {
    return sortedBookings.filter(b => b.status === 'done');
  }, [sortedBookings]);

  const handleMarkAsDone = async (bookingId: string) => {
    await markBookingAsDone(bookingId);
  };

  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-headline flex items-center">
          <CalendarCheck className="mr-3 h-8 w-8 text-primary" />
          Demo Booking Requests
        </h1>
        <p className="text-muted-foreground">Manage and track all incoming requests for product demos.</p>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Booking List</CardTitle>
          <CardDescription>Review pending requests and see a history of completed demos.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pending">
                Pending ({pendingBookings.length})
              </TabsTrigger>
              <TabsTrigger value="done">
                Done ({doneBookings.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="pending" className="mt-4">
              <BookingsTable bookings={pendingBookings} onMarkAsDone={handleMarkAsDone} />
            </TabsContent>
            <TabsContent value="done" className="mt-4">
              <BookingsTable bookings={doneBookings} onMarkAsDone={handleMarkAsDone} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
