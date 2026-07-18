

"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { getFriendlyErrorMessage } from '@/lib/friendly-errors';
import { Loader2, CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { DemoRequest } from '@/lib/types';
import { serverAddDemoRequest, serverGetDemoRequests } from '@/actions/demo-actions';

const demoBookingFormSchema = z.object({
  requesterType: z.enum(['individual', 'company'], { required_error: "Please select if you are an individual or a company."}),
  name: z.string().min(2, "Name is required."),
  email: z.string().email("Please enter a valid email."),
  phone: z.string().min(7, "Please enter a valid phone number."),
  companyName: z.string().optional(),
  preferredDate: z.date({ required_error: "Please select a date." }),
  preferredSlot: z.string({ required_error: "Please select a time slot." }),
  visitorTimezone: z.string().optional(),
}).refine((data) => {
    if (data.requesterType === 'company') {
        return !!data.companyName && data.companyName.length >= 2;
    }
    return true;
}, {
    message: "Company name is required for companies.",
    path: ['companyName'],
});

type DemoBookingFormValues = z.infer<typeof demoBookingFormSchema>;

// Admin's available hours in PHT (UTC+8) are 9am-10pm. This translates to UTC hours 1 through 14.
const adminAvailableUTCHours = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

export function DemoBookingDialog({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [rawDemoRequests, setRawDemoRequests] = useState<DemoRequest[]>([]);
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const form = useForm<DemoBookingFormValues>({
    resolver: zodResolver(demoBookingFormSchema),
    defaultValues: {
      requesterType: 'individual',
      name: '',
      email: '',
      phone: '',
      companyName: '',
      preferredDate: undefined,
      preferredSlot: undefined,
      visitorTimezone: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
        serverGetDemoRequests().then(setRawDemoRequests).catch(err => {
            console.error("Failed to fetch demo requests:", err);
            toast({ variant: 'destructive', title: 'Error loading slots', description: 'Could not load existing time slots. Please try again.' });
        });
    }
  }, [isOpen, toast]);

  const selectedDate = form.watch('preferredDate');
  const requesterType = form.watch('requesterType');
  
  useEffect(() => {
    // When date changes, clear the selected time slot
    form.setValue('preferredSlot', '');
  }, [selectedDate, form]);

  const availableSlots = useMemo(() => {
    if (!selectedDate) return [];

    const now = new Date();
    const bookedSlots = new Set(rawDemoRequests.map(req => req.preferredDate));

    const generatedSlots = adminAvailableUTCHours
        .map(hour => {
            // Create a date object representing the potential slot in UTC
            const slotTimeUTC = new Date(Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), selectedDate.getUTCDate(), hour));

            // Don't show slots that are in the past for the visitor
            if (slotTimeUTC < now) {
                return null;
            }
            
            // Check if this UTC slot is already booked
            if (bookedSlots.has(slotTimeUTC.toISOString())) {
                return null;
            }
            
            // Return the slot's UTC ISO string as the value, and the formatted local time as the label
            return {
                value: slotTimeUTC.toISOString(),
                label: slotTimeUTC.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
            };
        })
        .filter(Boolean); // Remove nulls from the array

    return generatedSlots as { value: string; label: string }[];
}, [selectedDate, rawDemoRequests]);


  useEffect(() => {
    if (isOpen) {
      form.reset();
    }
  }, [isOpen, form]);


  const onSubmit = async (data: DemoBookingFormValues) => {
    setIsSubmitting(true);
    try {
      // The `preferredSlot` from the form is the UTC ISO string we need to save.
      const finalData: Omit<DemoRequest, 'id' | 'createdAt' | 'status'> = {
          requesterType: data.requesterType,
          name: data.name,
          email: data.email,
          phone: data.phone,
          companyName: data.requesterType === 'company' ? data.companyName : undefined,
          visitorTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          preferredDate: data.preferredSlot, // Save the selected UTC ISO string
      };
      await serverAddDemoRequest(finalData);
      toast({ title: "Demo Request Sent", description: "We've received your request and will be in touch shortly." });
      onClose();
    } catch (error) {
      console.error("Failed to submit demo request", error);
      toast({ variant: "destructive", title: "Request failed", description: getFriendlyErrorMessage(error, "We couldn’t send your request. Please try again.") });
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
            Schedule a live demo with our team to see Rental Pilot in action.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} autoComplete="off" className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
            <FormField
              control={form.control}
              name="requesterType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>I am a...</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="individual" /></FormControl>
                        <FormLabel className="font-normal">Individual</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="company" /></FormControl>
                        <FormLabel className="font-normal">Company</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            {requesterType === 'company' && (
              <FormField control={form.control} name="companyName" render={({ field }) => (
                <FormItem><FormLabel>Company Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
            )}
             <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
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
                              className={cn("w-full justify-start text-left font-normal",!field.value && "text-muted-foreground")}
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
                  name="preferredSlot"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Time</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value} disabled={!selectedDate || availableSlots.length === 0}>
                        <FormControl>
                          <SelectTrigger>
                            <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                            <SelectValue placeholder="Select a time slot" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableSlots.length > 0 ? (
                             availableSlots.map(slot => (
                                <SelectItem key={slot.value} value={slot.value}>{slot.label}</SelectItem>
                             ))
                          ) : (
                             <SelectItem value="no-slots" disabled>
                                {selectedDate ? 'No slots for this day' : 'Select a date first'}
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
