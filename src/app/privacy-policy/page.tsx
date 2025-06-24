
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-3xl shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center gap-2 mb-4">
            <ShieldCheck className="h-10 w-10 text-primary" />
            <CardTitle className="text-3xl font-bold font-headline">Privacy Policy</CardTitle>
          </div>
          <CardDescription>
            Your privacy is important to us.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto px-6 text-muted-foreground">
            <h3 className="font-semibold text-lg text-foreground">1. Information We Collect</h3>
            <p>Our application may collect personal identification information from users in a variety of ways, including, but not limited to, when users visit our site, register on the site, and in connection with other activities, services, features or resources we make available on our application.</p>
            
            <h3 className="font-semibold text-lg text-foreground">2. How We Use Collected Information</h3>
            <p>We may collect and use personal information for the following purposes: to run and operate our application, to improve customer service, to personalize user experience, and to send periodic emails.</p>

            <h3 className="font-semibold text-lg text-foreground">3. Data Protection</h3>
            <p>We adopt appropriate data collection, storage and processing practices and security measures to protect against unauthorized access, alteration, disclosure or destruction of your personal information, username, password, transaction information and data stored on our application.</p>
            
            <h3 className="font-semibold text-lg text-foreground">4. Sharing Your Information</h3>
            <p>We do not sell, trade, or rent users' personal identification information to others. We may share generic aggregated demographic information not linked to any personal identification information regarding visitors and users with our business partners, trusted affiliates and advertisers for the purposes outlined above.</p>
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
