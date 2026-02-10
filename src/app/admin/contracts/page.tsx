
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText } from 'lucide-react';

export default function AdminContractsPage() {
  return (
    <div className="container mx-auto py-2">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-headline flex items-center">
          <FileText className="mr-3 h-8 w-8 text-primary" />
          Contract Templates
        </h1>
        <p className="text-muted-foreground">Manage reusable contract templates for your clients.</p>
      </div>

       <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Feature Coming Soon</CardTitle>
          <CardDescription>
            The ability to create and manage global contract templates will be available here in a future update.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <p className="text-muted-foreground">For now, contract text can be entered directly when initiating a digital signature request from the Tenants page.</p>
        </CardContent>
      </Card>
    </div>
  );
}
