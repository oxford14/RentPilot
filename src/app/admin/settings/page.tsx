
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Clock, Save, Cog, Loader2 } from 'lucide-react';
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

export default function AdminTimezoneSettingsPage() {
  const { systemTimezone, updateSystemTimezone } = useAppContext();
  const { toast } = useToast();
  const [selectedTimezone, setSelectedTimezone] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (systemTimezone) {
      setSelectedTimezone(systemTimezone);
    }
  }, [systemTimezone]);

  const handleTimezoneChange = (value: string) => {
    setSelectedTimezone(value);
  };

  const handleSaveChanges = async () => {
    if (selectedTimezone) {
      setIsSaving(true);
      try {
        await updateSystemTimezone(selectedTimezone);
        toast({
          title: "Settings Saved",
          description: `System timezone updated to ${timezones.find(tz => tz.value === selectedTimezone)?.label || selectedTimezone}.`,
        });
      } catch (error) {
        // The context already shows a toast on error, so this is optional
        console.error("Failed to save timezone settings from page.", error);
      } finally {
        setIsSaving(false);
      }
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
        <p className="text-muted-foreground">Manage the primary timezone for the RentPilot application.</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="mr-2 h-6 w-6 text-primary" />
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
                Currently set to: {timezones.find(tz => tz.value === systemTimezone)?.label || systemTimezone}
              </p>
            )}
          </div>

          <div className="border-t pt-6">
            <Button onClick={handleSaveChanges} disabled={isSaving || !selectedTimezone || selectedTimezone === systemTimezone} className="shadow-md hover:shadow-lg transition-shadow">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isSaving ? 'Saving...' : 'Save Timezone Setting'}
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
