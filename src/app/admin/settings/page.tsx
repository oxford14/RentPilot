
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Cog } from 'lucide-react';

export default function AdminSettingsPage() {
  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-headline">System Settings</h1>
        <p className="text-muted-foreground">Manage global TenantTracker application settings.</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Cog className="mr-2 h-6 w-6 text-primary" />
            Configuration Options
          </CardTitle>
          <CardDescription>
            This section is a placeholder for future system-wide configuration settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-8 text-center text-muted-foreground">
            <Cog className="mx-auto h-16 w-16 mb-4" />
            <p className="text-xl">System settings will be available here.</p>
            <p>Currently, there are no configurable global settings.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
