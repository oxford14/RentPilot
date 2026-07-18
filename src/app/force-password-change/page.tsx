
"use client";

import React from 'react';
import { ForcePasswordChangeForm } from '@/components/auth/ForcePasswordChangeForm';
import Image from 'next/image';
import { MAIN_APP_LOGO_URL } from '@/lib/branding';

export default function ForcePasswordChangePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
       <div className="flex justify-center items-center py-4 mb-4">
        <Image
          src={MAIN_APP_LOGO_URL}
          alt="Rental Pilot Logo"
          width={240}
          height={60}
          priority
          unoptimized
          data-ai-hint="app logo"
        />
      </div>
      <ForcePasswordChangeForm />
    </div>
  );
}
