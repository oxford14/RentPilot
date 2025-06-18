
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { KeyRound, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center items-center gap-2 mb-4">
            <KeyRound className="h-10 w-10 text-primary" />
            <CardTitle className="text-3xl font-bold font-headline">Forgot Password</CardTitle>
          </div>
          <CardDescription>
            This feature is not yet implemented.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground">
            Password recovery functionality is currently under development.
            Please contact support if you need assistance.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col items-center gap-4 pt-6">
          <Link href="/login" passHref>
            <Button variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Login
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
