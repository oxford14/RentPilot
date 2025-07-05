
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle } from 'lucide-react';

export default function FeatureDisabledPage() {
  return (
    <div className="container mx-auto py-8 text-center">
      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
          <CardTitle>Feature Disabled</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">The contract management feature has been disabled to resolve a system startup issue.</p>
        </CardContent>
      </Card>
    </div>
  );
}
