"use client";

import React, { useState, useEffect } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { handleSignUp } from '@/actions/signup-actions';
import { Eye, EyeOff, ArrowLeft, AlertTriangle, Loader2, ArrowRight } from 'lucide-react';
import { MAIN_APP_LOGO_URL } from '@/lib/branding';
import type { BusinessType } from '@/lib/types';

const darkField =
  'h-12 rounded-xl border-white/10 bg-white/5 px-4 text-white placeholder:text-white/35 focus-visible:ring-brand/60 focus-visible:ring-offset-0';
const darkLabel = 'text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60';

/* ------------------------------- Sign in ------------------------------- */

const loginFormSchema = z.object({
  username: z.string().min(1, { message: 'Username is required.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

function LoginForm() {
  const { login: authLogin, isLoading: authLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setError(null);
    const success = await authLogin(data.username, data.password);
    if (!success) {
      setError('Invalid username/email or password. Please try again.');
    }
  };

  const submitting = form.formState.isSubmitting || authLoading;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {error && (
          <Alert
            variant="destructive"
            className="animate-fade-in-up border-red-400/30 bg-red-500/10 text-red-200 [&>svg]:text-red-300"
            role="alert"
          >
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Login failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem className="login-input">
              <FormLabel className={darkLabel}>Username or email</FormLabel>
              <FormControl>
                <Input placeholder="you@company.com" autoComplete="username" className={darkField} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem className="login-input">
              <FormLabel className={darkLabel}>Password</FormLabel>
              <div className="relative">
                <FormControl>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className={`${darkField} pr-12`}
                    {...field}
                  />
                </FormControl>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-1.5 top-1/2 h-9 w-9 -translate-y-1/2 cursor-pointer text-white/50 hover:bg-transparent hover:text-white"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-between gap-3 pt-1">
          <Link
            href="/forgot-password"
            className="cursor-pointer text-sm font-medium text-brand-soft transition-colors duration-200 hover:text-white"
          >
            Forgot password?
          </Link>
          <Button
            type="submit"
            size="lg"
            className="group h-12 cursor-pointer rounded-full bg-brand px-8 text-sm font-semibold uppercase tracking-wider text-white shadow-lg shadow-brand/25 transition-all duration-200 hover:bg-brand-dark"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                Login
                <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}

/* ------------------------------- Sign up ------------------------------- */

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

function SignUpForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
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
          title: 'Account created!',
          description: 'Your free trial has started. Sign in to continue.',
        });
        form.reset();
        onSuccess();
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="login-input">
              <FormLabel className={darkLabel}>Your name or business name</FormLabel>
              <FormControl>
                <Input placeholder="Acme Rentals" className={darkField} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="login-input">
              <FormLabel className={darkLabel}>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@company.com" className={darkField} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem className="login-input">
              <FormLabel className={darkLabel}>Username</FormLabel>
              <FormControl>
                <Input placeholder="Choose a username" className={darkField} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem className="login-input">
              <FormLabel className={darkLabel}>Password</FormLabel>
              <div className="relative">
                <FormControl>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 6 characters"
                    className={`${darkField} pr-12`}
                    {...field}
                  />
                </FormControl>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-1.5 top-1/2 h-9 w-9 -translate-y-1/2 cursor-pointer text-white/50 hover:bg-transparent hover:text-white"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="businessType"
            render={({ field }) => (
              <FormItem className="login-input">
                <FormLabel className={darkLabel}>Business type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className={darkField}>
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
                <FormLabel className={darkLabel}>Timezone</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className={darkField}>
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
          className="group h-12 w-full cursor-pointer rounded-full bg-brand text-sm font-semibold uppercase tracking-wider text-white shadow-lg shadow-brand/25 transition-all duration-200 hover:bg-brand-dark"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account…
            </>
          ) : (
            <>
              Start my free trial
              <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </>
          )}
        </Button>

        <p className="text-center text-xs text-white/50">No credit card required · Cancel anytime</p>
      </form>
    </Form>
  );
}

/* -------------------------------- Page --------------------------------- */

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-ink p-4">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full bg-ink font-body text-white">
      {/* Ambient brand glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_-10%,_rgba(37,99,235,0.25)_0%,_transparent_60%)]"
      />

      {/* Desktop visual plane */}
      <aside className="relative hidden w-[46%] overflow-hidden lg:block xl:w-[48%]">
        <Image
          src="/images/property-dusk.png"
          alt="Modern rental property at dusk"
          fill
          priority
          sizes="48vw"
          className="object-cover animate-ken-burns"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-ink/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-ink/40" />

        <div className="absolute inset-0 flex flex-col justify-between p-10 xl:p-12">
          <Link href="/welcome" className="inline-flex w-fit items-center transition-opacity duration-200 hover:opacity-90">
            <Image
              src={MAIN_APP_LOGO_URL}
              alt="Rental Pilot"
              width={282}
              height={100}
              priority
              unoptimized
              className="h-11 w-auto object-contain brightness-0 invert"
            />
          </Link>

          <div className="animate-fade-in-up max-w-md space-y-3">
            <p className="font-display text-3xl font-bold leading-tight tracking-tight text-white xl:text-4xl">
              Your rentals,<br />under control.
            </p>
            <p className="max-w-sm text-sm leading-relaxed text-white/75">
              Tenants, payments, and vehicle bookings — one workspace for landlords and fleet operators.
            </p>
          </div>
        </div>
      </aside>

      {/* Auth plane */}
      <main className="relative flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-4 sm:px-6 sm:py-6 lg:max-w-lg lg:justify-center lg:px-10 xl:px-14">
          {/* Mobile hero — image with centered logo, like the reference */}
          <div className="animate-fade-in relative mb-6 h-48 overflow-hidden rounded-3xl sm:h-56 lg:hidden">
            <Image
              src="/images/property-dusk.png"
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/40 to-ink/30" />
            <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 py-3">
              <Link
                href="/welcome"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-ink/40 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm transition-opacity duration-200 hover:opacity-80"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </Link>
            </div>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <Image
                src={MAIN_APP_LOGO_URL}
                alt="Rental Pilot"
                width={282}
                height={100}
                priority
                unoptimized
                className="h-12 w-auto object-contain brightness-0 invert drop-shadow-lg"
              />
            </div>
          </div>

          {/* Desktop back link */}
          <div className="mb-6 hidden lg:block">
            <Link
              href="/welcome"
              className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-white/60 transition-colors duration-200 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as 'signin' | 'signup')} className="w-full">
            {/* Heading follows the active tab */}
            <div className="animate-fade-in-up mb-5 space-y-1.5">
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-[2rem]">
                {tab === 'signin' ? 'Welcome back!' : 'Create your account'}
              </h1>
              <p className="text-[15px] leading-relaxed text-white/60">
                {tab === 'signin'
                  ? 'Sign in to your account'
                  : 'Start your 1-month free trial — no credit card required'}
              </p>
            </div>

            <TabsList className="animate-fade-in-up mb-5 grid h-12 w-full grid-cols-2 rounded-full border border-white/10 bg-white/5 p-1 text-white/60">
              <TabsTrigger
                value="signin"
                className="h-full cursor-pointer rounded-full text-sm font-semibold data-[state=active]:bg-brand data-[state=active]:text-white data-[state=active]:shadow-md"
              >
                Sign in
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="h-full cursor-pointer rounded-full text-sm font-semibold data-[state=active]:bg-brand data-[state=active]:text-white data-[state=active]:shadow-md"
              >
                Sign up
              </TabsTrigger>
            </TabsList>

            <div className="animate-fade-in-up rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm sm:p-6">
              <TabsContent value="signin" className="mt-0">
                <LoginForm />
              </TabsContent>
              <TabsContent value="signup" className="mt-0">
                <SignUpForm onSuccess={() => setTab('signin')} />
              </TabsContent>
            </div>
          </Tabs>

          <p className="mt-6 pb-2 text-center text-sm text-white/50">
            {tab === 'signin' ? (
              <>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => setTab('signup')}
                  className="cursor-pointer font-semibold text-brand-soft transition-colors hover:text-white"
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setTab('signin')}
                  className="cursor-pointer font-semibold text-brand-soft transition-colors hover:text-white"
                >
                  Sign in
                </button>
              </>
            )}
          </p>

          <p className="pb-2 text-center text-[11px] leading-relaxed text-white/35">
            By continuing, you agree to our{' '}
            <Link href="/terms" className="cursor-pointer underline transition-colors hover:text-white/70">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy-policy" className="cursor-pointer underline transition-colors hover:text-white/70">
              Privacy Policy
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
