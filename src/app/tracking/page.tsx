"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MapPin } from 'lucide-react';

export default function TrackingPage() {
  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-headline flex items-center">
          <MapPin className="mr-3 h-8 w-8 text-primary" />
          Tracking
        </h1>
        <p className="text-muted-foreground">This feature is currently under development.</p>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Feature Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The tracking functionality for D' First Hub is being built and will be available here soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
