
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Users, Building } from 'lucide-react'; // Users for clients, Building for something else if needed

export default function AdminDashboardPage() {
  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-headline">Admin Dashboard</h1>
        <p className="text-muted-foreground">Super admin overview and management tools.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-headline">Manage Clients</CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Client Organizations</div>
            <p className="text-xs text-muted-foreground">View, add, or edit client accounts.</p>
            <Link href="/admin/clients" passHref className="mt-2">
              <Button variant="outline" size="sm" className="mt-2">Go to Clients</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Placeholder for future admin functionalities */}
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 opacity-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-headline">System Settings</CardTitle>
            <Building className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Configuration</div>
            <p className="text-xs text-muted-foreground">Future: Global application settings.</p>
            <Button variant="outline" size="sm" className="mt-2" disabled>Coming Soon</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
