"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogIn, Eye, EyeOff, BarChart3, Clock4, ShieldCheck, Facebook, AlertTriangle, ChevronRight, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MAIN_APP_LOGO_URL } from '@/lib/branding';
import { ChatWidget } from '@/components/chat/ChatWidget';
import { DemoBookingDialog } from '@/components/book-demo/DemoBookingDialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const loginFormSchema = z.object({
  username: z.string().min(1, { message: "Username is required." }),
  password: z.string().min(1, { message: "Password is required." }),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

function Feature({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="app-surface flex items-start gap-3 p-3">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold leading-tight text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function LoginBox() {
  const { login: authLogin, isLoading: authLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setError(null);
    const success = await authLogin(data.username, data.password);
    if (!success) {
      setError("Invalid username/email or password. Please try again.");
    }
  };

  return (
    <Card className="app-glass w-full max-w-md">
      <CardHeader className="space-y-4 pb-3">
        <div className="flex justify-center">
          <Image
            src={MAIN_APP_LOGO_URL}
            alt="RentPilot Logo"
            width={180}
            height={50}
            priority
            unoptimized
            data-ai-hint="app logo"
          />
        </div>
        <div className="space-y-1 text-center">
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Sign in to continue managing your rental operations.</CardDescription>
        </div>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} autoComplete="off">
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Login Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username or Email</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your username" {...field} autoComplete="off" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Password</FormLabel>
                  </div>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        {...field}
                        className="pr-10"
                        autoComplete="off"
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="flex justify-end">
                    <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex flex-col items-center gap-4">
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting || authLoading}>
              {form.formState.isSubmitting || authLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </>
              )}
            </Button>
            <div className="text-sm text-muted-foreground">
              New here?{" "}
              <Link href="/signup" className="font-semibold text-primary hover:underline">
                Start your free trial
              </Link>
            </div>
            <div className="w-full text-center text-xs text-muted-foreground">
              <p>By signing in, you agree to our</p>
              <div className="mt-1 flex items-center justify-center gap-2">
                <Link href="/terms" className="underline hover:text-primary">
                  Terms of Service
                </Link>
                <span>and</span>
                <Link href="/privacy-policy" className="underline hover:text-primary">
                  Privacy Policy
                </Link>
              </div>
            </div>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <>
      <div className="relative min-h-screen w-full overflow-hidden p-4 sm:p-6">
        <div className="pointer-events-none absolute -left-24 top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-28 bottom-10 h-72 w-72 rounded-full bg-violet-300/20 blur-3xl" />
        <div className="relative mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="app-glass flex min-h-[620px] flex-col justify-between p-6 sm:p-10">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Built for modern rental teams
              </div>
              <div className="space-y-4">
                <h1 className="max-w-xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                  A cleaner, smarter way to run your rental business
                </h1>
                <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
                  RentPilot brings tenant management, billing, and monitoring into one elegant workspace so your team can move faster with confidence.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Feature
                  icon={ShieldCheck}
                  title="Secure by default"
                  description="Role-based access and protected workflows for every account."
                />
                <Feature
                  icon={Clock4}
                  title="On-time collections"
                  description="Automated reminders and clean overdue tracking dashboards."
                />
                <Feature
                  icon={BarChart3}
                  title="Insightful analytics"
                  description="Real-time reporting to understand performance at a glance."
                />
                <Feature
                  icon={ChevronRight}
                  title="Fast onboarding"
                  description="Start in minutes with guided setup and flexible modules."
                />
              </div>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button onClick={() => setIsDemoModalOpen(true)} size="lg">
                Book a live demo
              </Button>
              <a
                href="https://www.facebook.com/rentpilotweb/"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
              >
                <Facebook className="mr-2 h-5 w-5" />
                Visit our page
              </a>
            </div>
          </section>
          <section className="flex min-h-[620px] items-center justify-center">
            <LoginBox />
          </section>
        </div>
      </div>
      <ChatWidget />
      <DemoBookingDialog isOpen={isDemoModalOpen} onClose={() => setIsDemoModalOpen(false)} />
    </>
  );
}
