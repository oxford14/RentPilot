
"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogIn, Eye, EyeOff } from 'lucide-react';

const loginFormSchema = z.object({
  username: z.string().min(1, { message: "Username is required." }),
  password: z.string().min(1, { message: "Password is required." }),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function LoginPage() {
  const { login: authLogin, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
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

  if (isLoading || isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center items-center py-4">
            <Image
              src="https://firebasestorage.googleapis.com/v0/b/tenanttracker-u4wuw.firebasestorage.app/o/Whisk_storyboard1c1ee4a7bebe492d87191d51%20(1).png?alt=media&token=459e8311-68ad-477a-8b52-32408db386ea"
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
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. admin" {...field} />
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
                        <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} className="pr-10" />
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
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                <LogIn className="mr-2 h-4 w-4" /> Sign In
              </Button>
              <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                Forgot Password?
              </Link>
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
    </div>
  );
}
