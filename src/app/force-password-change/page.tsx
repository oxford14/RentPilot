
"use client";

import React from 'react';
import { ForcePasswordChangeForm } from '@/components/auth/ForcePasswordChangeForm';
import Image from 'next/image';

export default function ForcePasswordChangePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
       <div className="flex justify-center items-center py-4 mb-4">
        <Image
          src="https://firebasestorage.googleapis.com/v0/b/tenanttracker-u4wuw.firebasestorage.app/o/client_logos%2F3933e2b3-200a-41b0-beb9-a8ab8d2ee234-cropped.png?alt=media&token=02a8c638-ae25-4318-b431-b079ba420602"
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
