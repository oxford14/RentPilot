
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-3xl shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center gap-2 mb-4">
            <FileText className="h-10 w-10 text-primary" />
            <CardTitle className="text-3xl font-bold font-headline">Terms of Service</CardTitle>
          </div>
          <CardDescription>
            Please read our terms of service carefully.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto px-6 text-muted-foreground">
            <h3 className="font-semibold text-lg text-foreground">1. Introduction</h3>
            <p>Welcome to our application. These terms and conditions outline the rules and regulations for the use of our services. By accessing this application we assume you accept these terms and conditions. Do not continue to use the application if you do not agree to all of the terms and conditions stated on this page.</p>
            
            <h3 className="font-semibold text-lg text-foreground">2. License</h3>
            <p>Unless otherwise stated, we and/or our licensors own the intellectual property rights for all material on the application. All intellectual property rights are reserved. You may access this from the application for your own personal use subjected to restrictions set in these terms and conditions.</p>

            <h3 className="font-semibold text-lg text-foreground">3. User Content</h3>
            <p>In these terms and conditions, “Your Content” shall mean any audio, video text, images or other material you choose to display on this application. By displaying Your Content, you grant us a non-exclusive, worldwide irrevocable, sub licensable license to use, reproduce, adapt, publish, translate and distribute it in any and all media.</p>
            
            <h3 className="font-semibold text-lg text-foreground">4. Limitation of liability</h3>
            <p>In no event shall we, nor any of our officers, directors and employees, be held liable for anything arising out of or in any way connected with your use of this application whether such liability is under contract. We, including our officers, directors and employees shall not be held liable for any indirect, consequential or special liability arising out of or in any way related to your use of this application.</p>
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
