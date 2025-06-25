
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { WifiOff } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center shadow-2xl">
        <CardHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <WifiOff className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="mt-4 text-2xl font-bold">You are offline</CardTitle>
          <CardDescription>
            It seems you've lost your internet connection. Please check your connection and try again.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Some pages may be available if you have visited them before.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
