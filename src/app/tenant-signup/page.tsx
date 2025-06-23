
"use client";

import React, { Suspense } from 'react';
import { TenantSignupForm } from '@/components/tenants/TenantSignupForm';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';

function TenantSignupPageContent() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="flex justify-center items-center py-4 mb-4">
        <Image
          src="https://firebasestorage.googleapis.com/v0/b/tenanttracker-u4wuw.firebasestorage.app/o/Whisk_storyboard1c1ee4a7bebe492d87191d51%20(1).png?alt=media&token=459e8311-68ad-477a-8b52-32408db386ea"
          alt="RentPilot Logo"
          width={240}
          height={60}
          priority
          unoptimized
          data-ai-hint="app logo"
        />
      </div>
      <TenantSignupForm />
    </div>
  );
}

// Wrap the component with Suspense for useSearchParams
export default function TenantSignupPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Loading...</p>
            </div>
        }>
            <TenantSignupPageContent />
        </Suspense>
    )
}
