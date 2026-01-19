"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Loader2, Check, ArrowLeft } from 'lucide-react';
import { handleSignUp } from '@/actions/signup-actions';
import { useRouter } from 'next/navigation';
import type { BusinessType } from '@/lib/types';

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

const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email."),
  username: z.string().min(3, "Username must be at least 3 characters."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  businessType: z.enum(['Standard', 'PC_Rental', 'ISP_Subscription', 'Vehicle_Rental'], { required_error: "Please select a business type." }),
  timezone: z.string({ required_error: "Please select your timezone." }),
});

type SignUpFormValues = z.infer<typeof signUpSchema>;

function PlanCard({ title, price, description, features, isFeatured = false }: { title: string, price: string, description: string, features: string[], isFeatured?: boolean }) {
    return (
        <Card className={isFeatured ? 'border-primary shadow-lg' : ''}>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription className="text-2xl font-bold">{price}</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="mb-4">{description}</p>
                <ul className="space-y-2">
                    {features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500" />
                            <span>{feature}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}


export default function SignUpPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<SignUpFormValues>({
        resolver: zodResolver(signUpSchema),
        defaultValues: {
            name: '',
            email: '',
            username: '',
            password: '',
            businessType: 'Standard',
            timezone: 'Asia/Manila',
        },
    });

    const onSubmit = async (data: SignUpFormValues) => {
        setIsLoading(true);
        try {
            const result = await handleSignUp(data);
            if (result.success) {
                toast({
                    title: "Signup Successful!",
                    description: "Your account has been created. Please log in to continue.",
                });
                router.push('/login');
            } else {
                toast({
                    variant: "destructive",
                    title: "Signup Failed",
                    description: result.message,
                });
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "An Error Occurred",
                description: "Something went wrong. Please try again.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
            <Card className="w-full max-w-4xl shadow-xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-bold font-headline">Join RentPilot Today</CardTitle>
                    <CardDescription>Start with a 1-month free trial. No credit card required.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-2 gap-8 items-start">
                        {/* Plans Display */}
                        <div className="space-y-6">
                            <PlanCard 
                                title="Trial Plan"
                                price="Free"
                                description="Get started with all the essential features for 1 month."
                                features={["Manage up to 10 tenants", "Payment Tracking", "Basic Reporting", "Email Support"]}
                                isFeatured={true}
                            />
                             <PlanCard 
                                title="Basic Plan"
                                price="₱200 / month"
                                description="Ideal for growing businesses that need more capacity."
                                features={["Up to 50 tenants", "Advanced Reporting", "AI Delinquency Prediction", "Priority Support"]}
                            />
                             <PlanCard 
                                title="Pro Plan"
                                price="₱500 / month"
                                description="For large-scale operations with unlimited needs."
                                features={["Unlimited tenants", "Advanced Reporting", "AI Delinquency Prediction", "Data Backup & Restore", "Phone & Chat Support"]}
                            />
                        </div>
                        {/* Signup Form */}
                        <div className="p-6 border rounded-lg bg-background">
                            <h3 className="text-xl font-semibold mb-4">Create Your Account</h3>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                     <FormField control={form.control} name="name" render={({ field }) => (
                                        <FormItem><FormLabel>Your Name or Business Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="email" render={({ field }) => (
                                        <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="username" render={({ field }) => (
                                        <FormItem><FormLabel>Username</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="password" render={({ field }) => (
                                        <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="businessType" render={({ field }) => (
                                        <FormItem><FormLabel>Business Type</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                                <SelectContent>{businessTypes.map(type => (<SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>))}</SelectContent>
                                            </Select><FormMessage />
                                        </FormItem>
                                    )}/>
                                    <FormField control={form.control} name="timezone" render={({ field }) => (
                                        <FormItem><FormLabel>Timezone</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                                <SelectContent>{timezones.map(tz => (<SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>))}</SelectContent>
                                            </Select><FormMessage />
                                        </FormItem>
                                    )}/>
                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Start My Free Trial
                                    </Button>
                                </form>
                            </Form>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="text-center text-sm text-muted-foreground justify-center pt-4">
                     <p>Already have an account? <Link href="/login" className="text-primary hover:underline">Log in</Link></p>
                </CardFooter>
            </Card>
        </div>
    );
}
