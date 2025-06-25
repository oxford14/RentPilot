
"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';
import { Loader2, KeyRound, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

const signupFormSchema = z.object({
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match.",
  path: ["confirmPassword"],
});

type SignupFormValues = z.infer<typeof signupFormSchema>;

export function TenantSignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { toast } = useToast();
  const { completeTenantSignup } = useAppContext();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("No invitation token found. Please use the link provided in your invitation.");
    }
  }, [token]);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: SignupFormValues) => {
    if (!token) return;

    setIsLoading(true);
    setError(null);
    const result = await completeTenantSignup(token, data.password);
    setIsLoading(false);

    if (result.success) {
      toast({
        title: "Account Created!",
        description: result.message,
      });
      router.push('/login');
    } else {
      setError(result.message);
      toast({
        variant: "destructive",
        title: "Signup Failed",
        description: result.message,
      });
    }
  };
  
  if (error) {
    return (
        <Card className="w-full max-w-md shadow-2xl">
            <CardHeader>
                <CardTitle className="text-2xl font-bold font-headline text-destructive">Error</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-destructive">{error}</p>
                 <Link href="/login" passHref className="mt-4 inline-block">
                    <Button variant="outline">Back to Login</Button>
                </Link>
            </CardContent>
        </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-2xl">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center items-center gap-2 mb-2">
            <KeyRound className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-bold font-headline">Create Your Account</CardTitle>
        </div>
        <CardDescription>
          Set a password to complete your RentPilot tenant portal registration.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <div className="relative">
                    <FormControl>
                        <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} autoComplete="off" />
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
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                   <div className="relative">
                    <FormControl>
                        <Input type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" {...field} autoComplete="off" />
                    </FormControl>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Creating Account...' : 'Complete Registration'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
