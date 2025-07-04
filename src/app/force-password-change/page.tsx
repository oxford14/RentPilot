
"use client";

import React from 'react';
import { ForcePasswordChangeForm } from '@/components/auth/ForcePasswordChangeForm';
import Image from 'next/image';

export default function ForcePasswordChangePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
       <div className="flex justify-center items-center py-4 mb-4">
        <Image
          src="https://firebasestorage.googleapis.com/v0/b/tenanttracker-u4wuw.firebasestorage.app/o/Whisk_storyboard1c1ee4a7bebe492d87191d51%20(1).png?alt=media"
          alt="RentPilot Logo"
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
