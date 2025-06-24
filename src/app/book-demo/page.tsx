
"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, setHours, setMinutes, addDays } from 'date-fns';
import { CalendarIcon, Clock, ArrowLeft, CheckCircle, Send, Loader2 } from 'lucide-react';
import Link from 'next/link';

const phoneRegex = new RegExp(/^(\+63|0)9\d{9}$/);

const bookingFormSchema = z.object({
  name: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  phone: z.string().regex(phoneRegex, 'Please enter a valid PH mobile number (e.g., 09xxxxxxxxx or +639xxxxxxxxx).'),
  date: z.date({ required_error: "Please select a date." }),
  time: z.string({ required_error: "Please select a time." }),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

const availableTimes = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00'
];

function formatTime(time: string) {
  const [hour, minute] = time.split(':');
  const h = parseInt(hour, 10);
  const period = h >= 12 ? 'PM' : 'AM';
  const adjustedHour = h % 12 === 0 ? 12 : h % 12;
  return `${adjustedHour}:${minute} ${period}`;
}

export default function BookDemoPage() {
  const { addDemoBooking } = useAppContext();
  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
    },
  });

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

  if (isSubmitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-lg text-center shadow-2xl">
          <CardHeader>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="mt-4 text-3xl font-bold">Thank You!</CardTitle>
            <CardDescription>Your demo request has been submitted successfully.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              We will review your request and get in touch with you at the email address you provided to confirm the details.
            </p>
          </CardContent>
          <CardFooter>
            <Link href="/login" className="w-full">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold font-headline">Schedule a Live Demo</CardTitle>
          <CardDescription>
            Find a time that works for you, and we'll show you how RentPilot can transform your rental management.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Juan Dela Cruz" {...field} />
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
                        <Input type="email" placeholder="you@example.com" {...field} />
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
                        <Input placeholder="09xxxxxxxxx" {...field} />
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
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
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
                            onSelect={field.onChange}
                            disabled={(date) => date < addDays(new Date(), 1) || date.getDay() === 0 || date.getDay() === 6}
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <Clock className="mr-2 h-4 w-4 opacity-50" />
                            <SelectValue placeholder="Select a time slot" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableTimes.map(time => (
                            <SelectItem key={time} value={time}>{formatTime(time)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-4">
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
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
              <Link href="/login">
                <Button type="button" variant="link">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to Login
                </Button>
              </Link>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
