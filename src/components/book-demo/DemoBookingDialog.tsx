
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { DemoRequest } from '@/lib/types';

const demoBookingFormSchema = z.object({
  name: z.string().min(2, "Name is required."),
  email: z.string().email("Please enter a valid email."),
  companyName: z.string().min(2, "Company name is required."),
  preferredDate: z.date({ required_error: "Please select a date." }),
  preferredTime: z.string({ required_error: "Please select a time." }),
});

type DemoBookingFormValues = z.infer<typeof demoBookingFormSchema>;

const allTimeSlots = [
  "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
  "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM",
  "05:00 PM", "06:00 PM", "07:00 PM", "08:00 PM",
  "09:00 PM", "10:00 PM"
];

function isSameDate(date1: Date, date2: Date) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}


export function DemoBookingDialog({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { addDemoRequest, rawDemoRequests } = useAppContext();
  const { toast } = useToast();
  const [availableSlots, setAvailableSlots] = useState<string[]>(allTimeSlots);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const form = useForm<DemoBookingFormValues>({
    resolver: zodResolver(demoBookingFormSchema),
    defaultValues: {
      name: '',
      email: '',
      companyName: '',
      preferredDate: undefined,
      preferredTime: undefined,
    },
  });

  const selectedDate = form.watch('preferredDate');

  useEffect(() => {
    if (isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  useEffect(() => {
    if (selectedDate) {
      // Get bookings for the selected day
      const bookingsForDay = rawDemoRequests.filter(req => 
        isSameDate(new Date(req.preferredDate), selectedDate)
      );
      const bookedSlots = new Set(bookingsForDay.map(req => req.preferredTime));

      // Filter out booked slots
      let slots = allTimeSlots.filter(slot => !bookedSlots.has(slot));

      // If selected date is today, filter out past slots
      const today = new Date();
      if (isSameDate(selectedDate, today)) {
        const currentHour = today.getHours();
        slots = slots.filter(slot => {
          const [time, period] = slot.split(' ');
          let [hour] = time.split(':').map(Number);
          if (period === 'PM' && hour !== 12) hour += 12;
          if (period === 'AM' && hour === 12) hour = 0; // Midnight case
          return hour > currentHour;
        });
      }
      
      setAvailableSlots(slots);
      // Reset preferredTime if it's no longer available
      const currentPreferredTime = form.getValues('preferredTime');
      if (currentPreferredTime && !slots.includes(currentPreferredTime)) {
          form.resetField('preferredTime');
      }
    } else {
        setAvailableSlots(allTimeSlots);
    }
  }, [selectedDate, rawDemoRequests, form]);

  const onSubmit = async (data: DemoBookingFormValues) => {
    setIsSubmitting(true);
    try {
      await addDemoRequest({
        ...data,
        preferredDate: data.preferredDate.toISOString(),
      });
      onClose();
    } catch (error) {
      console.error("Failed to submit demo request", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card shadow-xl rounded-lg">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Request a Demo</DialogTitle>
          <DialogDescription>
            Schedule a live demo with our team to see RentPilot in action.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="companyName" render={({ field }) => (
              <FormItem><FormLabel>Company Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                 <FormField
                  control={form.control}
                  name="preferredDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Preferred Date</FormLabel>
                      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn("w-full justify-start text-left font-normal h-11",!field.value && "text-muted-foreground")}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
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
                            disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() - 1)) || date.getDay() === 0 || date.getDay() === 6}
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
                  name="preferredTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Time</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedDate || availableSlots.length === 0}>
                        <FormControl>
                          <SelectTrigger className="h-11">
                            <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                            <SelectValue placeholder="Select a time slot" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableSlots.length > 0 ? (
                             availableSlots.map(slot => (
                                <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                             ))
                          ) : (
                             <SelectItem value="no-slots" disabled>
                                {selectedDate ? 'No available slots for today' : 'Select a date first'}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>

            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
