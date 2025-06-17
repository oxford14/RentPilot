
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Clock, Save, Cog } from 'lucide-react'; // Changed Cog to Clock for primary icon
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';

const timezones = [
  { value: 'Etc/UTC', label: 'Coordinated Universal Time (UTC)' },
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Berlin', label: 'Berlin, Amsterdam (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
  { value: 'Asia/Manila', label: 'Manila (PST)'},
];

export default function AdminTimezoneSettingsPage() { // Renamed component
  const { systemTimezone, updateSystemTimezone } = useAppContext();
  const { toast } = useToast();
  const [selectedTimezone, setSelectedTimezone] = useState<string | null>(null);

  useEffect(() => {
    if (systemTimezone) {
      setSelectedTimezone(systemTimezone);
    }
  }, [systemTimezone]);

  const handleTimezoneChange = (value: string) => {
    setSelectedTimezone(value);
    updateSystemTimezone(value); 
  };

  const handleSaveChanges = () => {
    if (selectedTimezone) {
      updateSystemTimezone(selectedTimezone);
      toast({
        title: "Settings Saved",
        description: `System timezone updated to ${timezones.find(tz => tz.value === selectedTimezone)?.label || selectedTimezone}.`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a timezone.",
      });
    }
  };

  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-headline">System Timezone Settings</h1>
        <p className="text-muted-foreground">Manage the primary timezone for the TenantTracker application.</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="mr-2 h-6 w-6 text-primary" /> {/* Changed icon */}
            Timezone Configuration
          </CardTitle>
          <CardDescription>
            Set the system-wide timezone. This may affect how dates and times are displayed and processed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="timezone-select" className="text-base font-semibold">System Timezone</Label>
            <Select 
              value={selectedTimezone || ''} 
              onValueChange={handleTimezoneChange}
            >
              <SelectTrigger id="timezone-select" className="w-full md:w-[400px] shadow-sm">
                <SelectValue placeholder="Select timezone..." />
              </SelectTrigger>
              <SelectContent>
                {timezones.map(tz => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
             {selectedTimezone && (
              <p className="text-xs text-muted-foreground mt-1">
                Currently selected: {timezones.find(tz => tz.value === selectedTimezone)?.label || selectedTimezone}
              </p>
            )}
          </div>

          <div className="border-t pt-6">
            <Button onClick={handleSaveChanges} className="shadow-md hover:shadow-lg transition-shadow">
              <Save className="mr-2 h-4 w-4" />
              Save Timezone Setting
            </Button>
          </div>
          
          <div className="mt-8 p-6 border rounded-lg bg-muted/30">
             <h3 className="text-lg font-semibold mb-2 flex items-center">
                <Cog className="mr-2 h-5 w-5 text-muted-foreground" />
                Other System Settings
             </h3>
             <p className="text-sm text-muted-foreground">
                Other global configuration options will be managed in their respective sections (e.g., Super Admin Users).
             </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

