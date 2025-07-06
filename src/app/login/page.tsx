
"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogIn, Eye, EyeOff, BarChart, Clock, User, DollarSign, Facebook, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatWidget } from '@/components/chat/ChatWidget';
import { DemoBookingDialog } from '@/components/book-demo/DemoBookingDialog';

const loginFormSchema = z.object({
  username: z.string().min(1, { message: "Username is required." }),
  password: z.string().min(1, { message: "Password is required." }),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

function Feature({ icon: Icon, text }: { icon: React.ElementType, text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <span className="font-medium text-lg">{text}</span>
    </div>
  );
}


function LoginBox() {
  const { login: authLogin, isLoading: authLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    await authLogin(data.username, data.password);
  };
  
  return (
    <Card className="w-full max-w-md shadow-2xl bg-card/80 backdrop-blur-sm border-white/20">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center items-center py-4">
            <Image
              src="https://firebasestorage.googleapis.com/v0/b/tenanttracker-u4wuw.firebasestorage.app/o/Whisk_storyboard1c1ee4a7bebe492d87191d51%20(1).png?alt=media"
              alt="RentPilot Logo"
              width={180}
              height={50}
              priority
              unoptimized
              data-ai-hint="app logo"
            />
          </div>
          <CardDescription>Please sign in to access your account</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} autoComplete="off">
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username or Email</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. admin" {...field} autoComplete="off" />
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
                    <FormLabel>Password</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} className="pr-10" autoComplete="off" />
                      </FormControl>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex flex-col items-center gap-4">
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting || authLoading}>
                <LogIn className="mr-2 h-4 w-4" /> Sign In
              </Button>
               <div className="mt-4 text-center text-xs text-muted-foreground w-full">
                <p>By signing in, you agree to our</p>
                <div className="flex items-center justify-center gap-2 mt-1">
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
  const [showLoginOnMobile, setShowLoginOnMobile] = useState(false);
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
      <div className="min-h-screen w-full">
        <div className="md:grid md:grid-cols-2 lg:grid-cols-3">
          
          {/* Promotional Section - visibility controlled */}
          <div className={cn(
            "lg:col-span-2 bg-gradient-to-br from-blue-50 to-indigo-100 relative",
            showLoginOnMobile ? "hidden" : "flex flex-col justify-center items-center p-8 min-h-screen",
            "md:flex md:flex-col md:justify-center md:items-center md:p-12 md:min-h-screen"
          )}>
            <Button
                onClick={() => setShowLoginOnMobile(true)}
                variant="outline"
                size="sm"
                className="absolute top-6 right-6 md:hidden bg-white text-primary shadow-md hover:bg-gray-100 font-semibold"
            >
                Sign In
            </Button>
            <div className="max-w-2xl space-y-8">
              <h1 className="text-5xl font-bold tracking-tight">
                  Take Control of Your Rentals with RentPilot
              </h1>
              <p className="text-xl text-gray-600">
                  Effortlessly manage tenants, track payments, and gain insights with our powerful, all-in-one platform.
              </p>
              <div className="space-y-4">
                  <Feature icon={User} text="Smart Tenant Tracking" />
                  <Feature icon={Clock} text="Due Date Reminders" />
                  <Feature icon={BarChart} text="Real-time Monitoring Dashboard" />
                  <Feature icon={DollarSign} text="Seamless Payment Logs" />
              </div>
              <div className="flex gap-4 pt-6">
                 <Button onClick={() => setIsDemoModalOpen(true)} size="lg" className="shadow-lg hover:shadow-xl transition-shadow">
                    Get Started
                  </Button>
                  <a
                    href="https://www.facebook.com/rentpilotweb/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(buttonVariants({ variant: "outline", size: "lg" }), "shadow-lg hover:shadow-xl transition-shadow")}
                  >
                    <Facebook className="mr-2 h-5 w-5"/>
                    Visit our Page
                  </a>
              </div>
            </div>
          </div>

          {/* Login Section - visibility controlled */}
          <div className={cn(
            "lg:col-span-1 bg-background relative",
            showLoginOnMobile ? "flex flex-col justify-center items-center p-4 min-h-screen" : "hidden",
            "md:flex md:flex-col md:justify-center md:items-center md:p-4 md:min-h-screen"
          )}>
            <Button
                variant="ghost"
                onClick={() => setShowLoginOnMobile(false)}
                className="md:hidden absolute top-4 left-4"
            >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
            </Button>
            <LoginBox />
          </div>
          
        </div>
      </div>
      <ChatWidget />
      <DemoBookingDialog isOpen={isDemoModalOpen} onClose={() => setIsDemoModalOpen(false)} />
    </>
  );
}
