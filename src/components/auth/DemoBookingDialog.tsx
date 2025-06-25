
"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, setHours, setMinutes, startOfDay, isToday as isTodayFns, isSameDay } from 'date-fns';
import { CalendarIcon, Clock, CheckCircle, Send, Loader2 } from 'lucide-react';

const bookingFormSchema = z.object({
  name: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  phone: z.string().min(7, { message: "Please enter a valid phone number." }),
  date: z.date({ required_error: "Please select a date." }),
  time: z.string({ required_error: "Please select a time." }),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

const allAvailableTimes = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
  '21:00', '21:30', '22:00'
];

function formatTime(time: string) {
  const [hour, minute] = time.split(':');
  const h = parseInt(hour, 10);
  const period = h >= 12 ? 'PM' : 'AM';
  const adjustedHour = h % 12 === 0 ? 12 : h % 12;
  return `${adjustedHour}:${minute} ${period}`;
}

interface DemoBookingDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function DemoBookingDialog({ isOpen, onOpenChange }: DemoBookingDialogProps) {
  const { addDemoBooking, rawDemoBookings } = useAppContext();
  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [timeSlots, setTimeSlots] = useState(allAvailableTimes);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
    },
  });

  const { getValues, setValue } = form; // Destructure for stable dependency array
  const selectedDate = form.watch('date');

  useEffect(() => {
    if (!selectedDate) {
      setTimeSlots(allAvailableTimes);
      return;
    }

    const bookedSlotsForDay = new Set(
      rawDemoBookings
        .filter(booking => {
          return isSameDay(new Date(booking.scheduled_at), selectedDate);
        })
        .map(booking => {
          return format(new Date(booking.scheduled_at), 'HH:mm');
        })
    );

    let availableTimes = [...allAvailableTimes];
    
    const now = new Date();
    if (isTodayFns(selectedDate)) {
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      availableTimes = availableTimes.filter(time => {
        const [hour, minute] = time.split(':').map(Number);
        if (hour > currentHour) return true;
        if (hour === currentHour && minute > currentMinute) return true;
        return false;
      });
    }

    const finalAvailableTimes = availableTimes.filter(time => !bookedSlotsForDay.has(time));
    
    setTimeSlots(finalAvailableTimes);

    const currentSelectedTime = getValues('time');
    if (currentSelectedTime && !finalAvailableTimes.includes(currentSelectedTime)) {
      setValue('time', undefined, { shouldValidate: true });
    }
  }, [selectedDate, rawDemoBookings, getValues, setValue]);

  useEffect(() => {
    if (isOpen) {
      form.reset();
      setIsSubmitted(false);
      setTimeSlots(allAvailableTimes);
    }
  }, [isOpen, form]);

  const onSubmit = async (data: BookingFormValues) => {
    try {
      const [hour, minute] = data.time.split(':');
      const scheduledAtDate = setMinutes(setHours(data.date, parseInt(hour)), parseInt(minute));

      await addDemoBooking({
        name: data.name,
        email: data.email,
        phone: data.phone,
        scheduled_at: scheduledAtDate.toISOString(),
      });

      toast({
        title: "Booking Confirmed!",
        description: "We've received your request and will contact you shortly.",
      });
      setIsSubmitted(true);
    } catch (error) {
      console.error("Booking submission error:", error);
      toast({
        variant: "destructive",
        title: "Booking Failed",
        description: "An unexpected error occurred. Please try again.",
      });
    }
  };

  const emptySlotsMessage = selectedDate
    ? 'No more slots available for this date.'
    : 'No available slots for this date.';
    
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold font-headline text-center">Schedule a Live Demo</DialogTitle>
          <DialogDescription className="text-center">
            Find a time that works for you, and we'll show you how RentPilot can transform your rental management.
          </DialogDescription>
        </DialogHeader>

        {isSubmitted ? (
          <div className="flex flex-col items-center justify-center text-center p-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-xl font-bold">Thank You!</h3>
            <p className="text-muted-foreground mt-2">
              Your demo request has been submitted successfully. We will get in touch with you shortly.
            </p>
            <DialogFooter className="mt-6">
               <DialogClose asChild>
                <Button type="button">Close</Button>
               </DialogClose>
            </DialogFooter>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-1">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input {...field} autoComplete="off" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="you@example.com" {...field} autoComplete="off" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input {...field} autoComplete="off" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <div></div> {/* Spacer */}
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Preferred Date</FormLabel>
                      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn("w-full pl-3 text-left font-normal bg-secondary", !field.value && "text-muted-foreground")}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              field.onChange(date);
                              setIsCalendarOpen(false);
                            }}
                            disabled={(date) => date < startOfDay(new Date()) || date.getDay() === 0 || date.getDay() === 6}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Time</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-secondary">
                            <Clock className="mr-2 h-4 w-4 opacity-50" />
                            <SelectValue placeholder="Select a time slot" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {timeSlots.length > 0 ? (
                            timeSlots.map(time => (
                              <SelectItem key={time} value={time}>{formatTime(time)}</SelectItem>
                            ))
                          ) : (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                              {emptySlotsMessage}
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin"/> Submitting...
                    </>
                    ) : (
                    <>
                        <Send className="mr-2 h-4 w-4"/> Request Demo
                    </>
                    )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
