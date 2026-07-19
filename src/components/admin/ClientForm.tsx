

"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { Client, BusinessType } from '@/lib/types';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import ReactCrop, { centerCrop, makeAspectCrop, type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ADMIN_SUBSCRIPTION_PLAN_OPTIONS,
  resolvePlanFormValue,
  getPlanDefinition,
  getPlanRate,
  type BillingCycle,
} from '@/lib/subscription-plans';
import { cropImageToOptimizedBlob } from '@/lib/logo-image';
import { getFriendlyErrorMessage } from '@/lib/friendly-errors';

const timezones = [
  { value: 'Etc/UTC', label: 'Coordinated Universal Time (UTC)' },
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Berlin', label: 'Berlin, Amsterdam (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
  { value: 'Asia/Manila', label: 'Manila (PHT)'},
];

const businessTypes: { value: BusinessType; label: string }[] = [
    { value: 'Standard', label: 'Standard (Apartment/Commercial)' },
    { value: 'PC_Rental', label: 'PC Rental / ESL Center' },
    { value: 'ISP_Subscription', label: 'ISP Subscription Monitoring' },
    { value: 'Vehicle_Rental', label: 'Vehicle Rental' },
];

const subscriptionPlans = ADMIN_SUBSCRIPTION_PLAN_OPTIONS;

const clientFormSchema = z.object({
  name: z.string().min(2, { message: "Client name must be at least 2 characters." }),
  logoFile: z.any().optional(),
  businessType: z.enum(['Standard', 'PC_Rental', 'ISP_Subscription', 'Vehicle_Rental']).optional(),
  subscriptionStatus: z.enum(['active', 'inactive'], { required_error: "Subscription status is required." }),
  subscriptionEndDate: z.date().optional(),
  subscriptionPlanName: z.string().optional(),
  subscriptionBillingCycle: z.enum(['monthly', 'yearly']).optional(),
  subscriptionRate: z.coerce.number().optional(),
  companyFundsStartingBalance: z.coerce.number().optional(),
  companyFundsStartDate: z.string().optional(),
  timezone: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

interface ClientFormProps {
  isOpen: boolean;
  onClose: () => void;
  client?: Client | null;
}

export function ClientForm({ isOpen, onClose, client }: ClientFormProps) {
  const { addClient, updateClient } = useAppContext();
  const { toast } = useToast();
  
  // State for image cropping
  const [preview, setPreview] = useState<string | null>(null);
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [croppedImageBlob, setCroppedImageBlob] = useState<Blob | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);


  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: client?.name || '',
      logoFile: undefined,
      businessType: client?.businessType || 'Standard',
      subscriptionStatus: client?.subscriptionStatus || 'active',
      subscriptionEndDate: client?.subscriptionEndDate ? new Date(client.subscriptionEndDate) : undefined,
      subscriptionPlanName: resolvePlanFormValue(client?.subscriptionPlanName),
      subscriptionBillingCycle: client?.subscriptionBillingCycle || 'monthly',
      subscriptionRate: client?.subscriptionRate || 0,
      companyFundsStartingBalance: client?.companyFundsStartingBalance || 0,
      companyFundsStartDate: client?.companyFundsStartDate ? new Date(client.companyFundsStartDate).toISOString().split('T')[0] : '2025-06-01',
      timezone: client?.timezone || 'Asia/Manila',
    },
  });

  const watchedPlanName = form.watch("subscriptionPlanName");
  const watchedBillingCycle = form.watch("subscriptionBillingCycle");

  // Auto-fill the rate from the selected plan + billing cycle (unless Custom Price).
  const applyPlanRate = (planValue?: string, cycle?: BillingCycle) => {
    if (!planValue || planValue === 'Custom Price') return;
    const def = getPlanDefinition(planValue);
    if (def) {
      form.setValue('subscriptionRate', getPlanRate(def, cycle ?? 'monthly'));
    }
  };

  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: client?.name || '',
        logoFile: undefined,
        businessType: client?.businessType || 'Standard',
        subscriptionStatus: client?.subscriptionStatus || 'active',
        subscriptionEndDate: client?.subscriptionEndDate ? new Date(client.subscriptionEndDate) : undefined,
        subscriptionPlanName: resolvePlanFormValue(client?.subscriptionPlanName),
        subscriptionBillingCycle: client?.subscriptionBillingCycle || 'monthly',
        subscriptionRate: client?.subscriptionRate || 0,
        companyFundsStartingBalance: client?.companyFundsStartingBalance || 0,
        companyFundsStartDate: client?.companyFundsStartDate ? new Date(client.companyFundsStartDate).toISOString().split('T')[0] : '2025-06-01',
        timezone: client?.timezone || 'Asia/Manila',
      });
      setPreview(client?.logoUrl || null);
      setCroppedImageBlob(null);
      setImgSrc('');
      setCrop(undefined);
      setIsSubmitting(false);
    }
  }, [client, isOpen, form]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        toast({ variant: 'destructive', title: 'Invalid File', description: 'Please select an image file.' });
        return;
      }
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImgSrc(reader.result?.toString() || '');
        setIsCropModalOpen(true);
        if (fileInputRef.current) {
          fileInputRef.current.value = ''; // Reset file input
        }
      });
      reader.readAsDataURL(file);
    }
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    imgRef.current = e.currentTarget;
    const { width, height } = e.currentTarget;
    // Set a default centered crop
    const newCrop = centerCrop(
      makeAspectCrop({ unit: '%', width: 90 }, 16 / 9, width, height),
      width,
      height
    );
    setCrop(newCrop);
  };
  
  const handleCropComplete = async () => {
    if (imgRef.current && crop?.width && crop?.height) {
        const blob = await cropImageToOptimizedBlob(imgRef.current, crop);
        setCroppedImageBlob(blob);
        if (blob) {
            setPreview(URL.createObjectURL(blob));
        }
        setIsCropModalOpen(false);
        setImgSrc('');
    }
  };

  const onSubmit = async (data: ClientFormValues) => {
    setIsSubmitting(true);
    const clientPayload: Partial<Client> = {
      name: data.name,
      businessType: data.businessType || 'Standard',
      subscriptionStatus: data.subscriptionStatus,
      subscriptionEndDate: data.subscriptionEndDate?.toISOString(),
      subscriptionPlanName: data.subscriptionPlanName,
      subscriptionBillingCycle: data.subscriptionBillingCycle,
      subscriptionRate: data.subscriptionRate,
      timezone: data.timezone,
    };
    
    if (client?.name === 'i-VirtuaTech') {
      clientPayload.companyFundsStartingBalance = data.companyFundsStartingBalance;
      clientPayload.companyFundsStartDate = data.companyFundsStartDate ? new Date(data.companyFundsStartDate).toISOString() : undefined;
    }

    try {
      if (client) { // Editing existing client
        await updateClient({ ...client, ...clientPayload }, croppedImageBlob);
        toast({ title: "Client Updated", description: `${data.name} has been updated successfully.` });
      } else { // Adding new client
        await addClient(clientPayload, croppedImageBlob);
        toast({ title: "Client Added", description: `${data.name} has been added successfully.` });
      }
      onClose();
    } catch (error: any) {
      console.error("Client form submission error:", error);
      const description = getFriendlyErrorMessage(
        error,
        "We couldn’t save this client. Please try again."
      );
      toast({
        variant: "destructive",
        title: "Save failed",
        description: description,
        duration: 9000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-xl bg-card shadow-xl rounded-lg">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl">{client ? 'Edit Client' : 'Add New Client'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} autoComplete="off" className="space-y-6 p-2 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Acme Corp Rentals" {...field} autoComplete="off" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="businessType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a business type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {businessTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <FormField
                  control={form.control}
                  name="subscriptionPlanName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subscription Plan</FormLabel>
                       <Select
                        value={field.value || undefined}
                        onValueChange={(value) => {
                          field.onChange(value);
                          applyPlanRate(value, watchedBillingCycle);
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a plan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {subscriptionPlans.map((plan) => (
                            <SelectItem key={plan.name} value={plan.name}>
                              {plan.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="subscriptionBillingCycle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Billing Cycle</FormLabel>
                      <Select
                        value={field.value || 'monthly'}
                        onValueChange={(value) => {
                          field.onChange(value);
                          applyPlanRate(watchedPlanName, value as BillingCycle);
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select cycle" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="subscriptionRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rate (₱)</FormLabel>
                      <FormControl>
                         <Input type="number" placeholder="e.g. 1500" {...field} disabled={watchedPlanName !== 'Custom Price'} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="subscriptionStatus"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Subscription Status</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex space-x-4 pt-2"
                        >
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="active" /></FormControl>
                            <FormLabel className="font-normal">Active</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="inactive" /></FormControl>
                            <FormLabel className="font-normal">Inactive</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="subscriptionEndDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Subscription End Date</FormLabel>
                      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
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
                            onSelect={(date) => {
                              field.onChange(date);
                              setIsCalendarOpen(false);
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormItem>
                  <FormLabel>Client Logo</FormLabel>
                  <FormControl>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={onFileChange}
                      autoComplete="off"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>

                <FormField
                  control={form.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Timezone</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a timezone" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {timezones.map(tz => (
                            <SelectItem key={tz.value} value={tz.value}>
                              {tz.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {preview && (
                <div className="space-y-2">
                  <FormLabel>Logo Preview</FormLabel>
                  <div className="flex items-center justify-center p-4 border rounded-md bg-muted">
                      <Image src={preview} alt="Logo preview" width={120} height={45} className="object-contain" />
                  </div>
                </div>
              )}
              
              {client?.name === 'i-VirtuaTech' && (
                <>
                <Separator />
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <h3 className="font-semibold text-foreground">i-VirtuaTech Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField
                        control={form.control}
                        name="companyFundsStartingBalance"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Starting Balance (₱)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormDescription className="text-xs">The initial amount in the company fund.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="companyFundsStartDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tracking Start Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                             <FormDescription className="text-xs">Date when 10% fund calculation begins.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                  </div>
                </div>
                </>
              )}


              <DialogFooter className="pt-4">
                <DialogClose asChild>
                  <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                </DialogClose>
                <Button type="submit" variant="default" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : (client ? 'Save Changes' : 'Add Client')}
                  </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Cropping Modal */}
      <Dialog open={isCropModalOpen} onOpenChange={setIsCropModalOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Crop Your Logo</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center items-center">
             {imgSrc && (
                <ReactCrop
                    crop={crop}
                    onChange={c => setCrop(c)}
                    aspect={16 / 9}
                    minWidth={100}
                >
                    <Image
                        ref={imgRef}
                        src={imgSrc}
                        alt="Crop preview"
                        onLoad={onImageLoad}
                        width={400}
                        height={400}
                        className="max-h-[60vh] object-contain"
                    />
                </ReactCrop>
            )}
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsCropModalOpen(false)}>Cancel</Button>
                <Button onClick={handleCropComplete}>Crop & Use Image</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
