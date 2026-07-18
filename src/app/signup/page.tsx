"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Users,
  Car,
  BellRing,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { handleSignUp } from '@/actions/signup-actions';
import { MAIN_APP_LOGO_URL } from '@/lib/branding';
import { SUBSCRIPTION_PLANS } from '@/lib/subscription-plans';
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
  { value: 'Asia/Manila', label: 'Manila (PHT)' },
];

const businessTypes: { value: BusinessType; label: string }[] = [
  { value: 'Standard', label: 'Standard (Apartment/Commercial)' },
  { value: 'PC_Rental', label: 'PC Rental / ESL Center' },
  { value: 'ISP_Subscription', label: 'ISP Subscription Monitoring' },
  { value: 'Vehicle_Rental', label: 'Vehicle Rental' },
];

const benefits = [
  { icon: Users, title: 'Tenants & billing', body: 'Track balances and payments per unit.' },
  { icon: Car, title: 'Vehicle rentals', body: 'A booking calendar for your whole fleet.' },
  { icon: BellRing, title: 'Automatic reminders', body: 'Due-date and overdue nudges, sent for you.' },
  { icon: Sparkles, title: 'AI delinquency prediction', body: 'Spot late payers before they slip.' },
];

const signUpSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  email: z.string().email('Please enter a valid email.'),
  username: z.string().min(3, 'Username must be at least 3 characters.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
  businessType: z.enum(['Standard', 'PC_Rental', 'ISP_Subscription', 'Vehicle_Rental'], {
    required_error: 'Please select a business type.',
  }),
  timezone: z.string({ required_error: 'Please select your timezone.' }),
});

type SignUpFormValues = z.infer<typeof signUpSchema>;

function formatRate(rate: number) {
  if (rate === 0) return 'Free';
  return `\u20b1${rate.toLocaleString()}`;
}

export default function SignUpPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
          title: 'Signup Successful!',
          description: 'Your account has been created. Please log in to continue.',
        });
        router.push('/login');
      } else {
        toast({ variant: 'destructive', title: 'Signup Failed', description: result.message });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'An Error Occurred',
        description: 'Something went wrong. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full bg-white font-body text-ink">
      {/* Brand value panel */}
      <aside className="relative hidden w-[45%] overflow-hidden bg-gradient-to-br from-brand via-brand-dark to-ink lg:flex xl:w-[48%]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_100%_0%,_rgba(255,255,255,0.16)_0%,_transparent_60%)]"
        />
        <div className="relative flex w-full flex-col justify-between p-10 xl:p-12">
          <Link href="/welcome" className="inline-flex w-fit items-center transition-opacity duration-200 hover:opacity-90">
            <Image
              src={MAIN_APP_LOGO_URL}
              alt="Rental Pilot"
              width={282}
              height={100}
              priority
              unoptimized
              className="h-12 w-auto object-contain brightness-0 invert xl:h-14"
            />
          </Link>

          <div className="animate-fade-in-up max-w-md space-y-8 py-10">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white/90 backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5" /> Free for 1 month
              </span>
              <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-white xl:text-4xl">
                Everything you need to run your rentals.
              </h1>
            </div>

            <ul className="space-y-4">
              {benefits.map((b, i) => (
                <li key={b.title} className={`animate-fade-in-up stagger-${i + 1} flex items-start gap-3`}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur-sm">
                    <b.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-white">{b.title}</p>
                    <p className="text-sm text-white/70">{b.body}</p>
                  </div>
                </li>
              ))}
            </ul>

            {/* Plan chips (live data) */}
            <div className="animate-fade-in-up stagger-5 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-xs font-medium text-white/70">
                Start on the free Trial — upgrade anytime.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {SUBSCRIPTION_PLANS.map((p) => (
                  <span
                    key={p.key}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-medium text-white"
                  >
                    {p.name}
                    <span className="text-white/60">{formatRate(p.rate)}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="animate-fade-in-up stagger-6 flex items-center gap-3">
            <Image
              src="/images/marketing/avatar-1.png"
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 rounded-full border-2 border-white/30 object-cover"
            />
            <p className="max-w-xs text-sm text-white/80">
              “Rental Pilot replaced three spreadsheets and a whiteboard.”
              <span className="mt-0.5 block text-xs text-white/50">Maria Santos · Manages 42 units</span>
            </p>
          </div>
        </div>
      </aside>

      {/* Form panel */}
      <main className="relative flex flex-1 flex-col">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_#EFF4FF_0%,_transparent_55%)]"
        />

        {/* Mobile brand band */}
        <div className="relative overflow-hidden bg-gradient-to-br from-brand via-brand-dark to-ink px-5 py-6 lg:hidden">
          <div className="flex items-center justify-between">
            <Link href="/welcome" className="inline-flex items-center gap-2 text-sm font-medium text-white/90 transition-opacity hover:opacity-80">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
            <Link href="/login" className="text-sm font-medium text-white/90 transition-opacity hover:opacity-80">
              Sign in
            </Link>
          </div>
          <div className="mt-4 flex items-center">
            <Image
              src={MAIN_APP_LOGO_URL}
              alt="Rental Pilot"
              width={282}
              height={100}
              priority
              unoptimized
              className="h-10 w-auto object-contain brightness-0 invert"
            />
          </div>
          <p className="mt-2 text-sm text-white/80">Start your 1-month free trial — no credit card required.</p>
        </div>

        {/* Desktop header */}
        <header className="hidden items-center justify-between px-5 py-5 sm:px-8 lg:flex lg:px-10">
          <Link href="/welcome" className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-muted-ink transition-colors hover:text-ink">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
          <Link href="/login" className="cursor-pointer text-sm font-medium text-muted-ink transition-colors hover:text-ink">
            Already have an account? <span className="font-semibold text-brand">Sign in</span>
          </Link>
        </header>

        <div className="flex flex-1 flex-col justify-center px-5 py-8 sm:px-8 lg:px-10 xl:px-16">
          <div className="mx-auto w-full max-w-lg">
            <div className="mb-7 animate-fade-in-up space-y-2">
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink">Create your account</h2>
              <p className="text-[15px] leading-relaxed text-muted-ink">
                Set up your workspace in under a minute.
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="login-input animate-fade-in-up stagger-1">
                      <FormLabel className="text-sm font-medium text-ink">Your name or business name</FormLabel>
                      <FormControl>
                        <Input placeholder="Acme Rentals" className="h-11" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="login-input animate-fade-in-up stagger-2">
                      <FormLabel className="text-sm font-medium text-ink">Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="you@company.com" className="h-11" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem className="login-input animate-fade-in-up stagger-2">
                      <FormLabel className="text-sm font-medium text-ink">Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Choose a username" className="h-11" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="login-input animate-fade-in-up stagger-3">
                      <FormLabel className="text-sm font-medium text-ink">Password</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="At least 6 characters"
                            className="h-11 pr-11"
                            {...field}
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-1.5 top-1/2 h-8 w-8 -translate-y-1/2 cursor-pointer text-muted-ink hover:bg-transparent hover:text-ink"
                          onClick={() => setShowPassword((v) => !v)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid animate-fade-in-up stagger-4 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="businessType"
                    render={({ field }) => (
                      <FormItem className="login-input">
                        <FormLabel className="text-sm font-medium text-ink">Business type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-11">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {businessTypes.map((type) => (
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
                  <FormField
                    control={form.control}
                    name="timezone"
                    render={({ field }) => (
                      <FormItem className="login-input">
                        <FormLabel className="text-sm font-medium text-ink">Timezone</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-11">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {timezones.map((tz) => (
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

                <Button
                  type="submit"
                  size="lg"
                  className="group h-12 w-full cursor-pointer bg-brand text-base font-semibold text-white shadow-sm shadow-brand/20 transition-all duration-200 hover:bg-brand-dark"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating your account…
                    </>
                  ) : (
                    <>
                      Start my free trial
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </>
                  )}
                </Button>

                <div className="flex items-center justify-center gap-1.5 text-sm text-muted-ink">
                  <ShieldCheck className="h-4 w-4 text-brand" />
                  No credit card required · Cancel anytime
                </div>

                <p className="text-center text-[11px] leading-relaxed text-muted-ink/80">
                  By creating an account, you agree to our{' '}
                  <Link href="/terms" className="cursor-pointer underline transition-colors hover:text-ink">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy-policy" className="cursor-pointer underline transition-colors hover:text-ink">
                    Privacy Policy
                  </Link>
                  .
                </p>

                <p className="text-center text-sm text-muted-ink lg:hidden">
                  Already have an account?{' '}
                  <Link href="/login" className="cursor-pointer font-semibold text-brand hover:underline">
                    Sign in
                  </Link>
                </p>
              </form>
            </Form>
          </div>
        </div>
      </main>
    </div>
  );
}
