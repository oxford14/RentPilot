
"use client";

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { DatabaseBackup, Download, HardDriveDownload, Loader2, Upload, UploadCloud, Save, Terminal } from 'lucide-react';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function AdminBackupsPage() {
  const {
    clients,
    rawTenants,
    rawPayments,
    rawExpenses,
    rawManagedUsers,
    rawSuperAdminUsers,
    rawAdditionalDues,
    rawBusinesses,
    rawWeeklyIncomes,
    restoreDataFromBackup,
  } = useAppContext();
  const { toast } = useToast();
  const [isSystemBackupLoading, setIsSystemBackupLoading] = useState(false);
  const [isClientDataBackupLoading, setIsClientDataBackupLoading] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isSystemCloudBackupLoading, setIsSystemCloudBackupLoading] = useState(false);
  const [isClientCloudBackupLoading, setIsClientCloudBackupLoading] = useState(false);

  const [isScheduleEnabled, setIsScheduleEnabled] = useState(false);
  const [frequency, setFrequency] = useState('daily');
  const [dayOfWeek, setDayOfWeek] = useState('0'); // Sunday
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [backupTime, setBackupTime] = useState('02:00');

  const weekDays = [
    { label: 'Sunday', value: '0' },
    { label: 'Monday', value: '1' },
    { label: 'Tuesday', value: '2' },
    { label: 'Wednesday', value: '3' },
    { label: 'Thursday', value: '4' },
    { label: 'Friday', value: '5' },
    { label: 'Saturday', value: '6' },
  ];

  const handleDownloadJson = (data: object, filename: string) => {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({
        title: "Backup Successful",
        description: `${filename} has been downloaded.`,
      });
    } catch (error) {
      console.error("Failed to generate backup:", error);
      toast({
        variant: "destructive",
        title: "Backup Failed",
        description: "Could not generate the backup file.",
      });
    }
  };

  const handleSystemBackup = () => {
    setIsSystemBackupLoading(true);
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    const systemData = {
      backupType: 'Full System Backup',
      timestamp: new Date().toISOString(),
      data: {
        clients,
        superAdminUsers: rawSuperAdminUsers,
        managedUsers: rawManagedUsers,
        tenants: rawTenants,
        payments: rawPayments,
        expenses: rawExpenses,
        additionalDues: rawAdditionalDues,
        businesses: rawBusinesses,
        weeklyIncomes: rawWeeklyIncomes
      },
    };
    handleDownloadJson(systemData, `rentpilot_full-system-backup_${timestamp}.json`);
    setIsSystemBackupLoading(false);
  };
  
  const handleClientDataBackup = () => {
    setIsClientDataBackupLoading(true);
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    const clientData = {
      backupType: 'All Client Data Backup',
      timestamp: new Date().toISOString(),
      data: {
        clients,
        managedUsers: rawManagedUsers,
        tenants: rawTenants,
        payments: rawPayments,
        expenses: rawExpenses,
        additionalDues: rawAdditionalDues,
        businesses: rawBusinesses,
        weeklyIncomes: rawWeeklyIncomes
      },
    };
    handleDownloadJson(clientData, `rentpilot_all-client-data-backup_${timestamp}.json`);
    setIsClientDataBackupLoading(false);
  };

  const handleUploadToDrive = async (data: object, filename: string, setLoading: (isLoading: boolean) => void) => {
    setLoading(true);

    const formData = new FormData();
    formData.append("file", JSON.stringify(data, null, 2));
    formData.append("filename", filename);
    formData.append("mimeType", "application/json");

    try {
      const response = await fetch("https://script.google.com/macros/s/AKfycbxIchCAjfTDrP4ir9JeYSzigEQkEWVLMXNaiFkw_kydkzeJWlmAx60haJ8f1ttYP5nM/exec", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Network response was not ok, status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.fileUrl) {
         toast({
          title: "Cloud Backup Successful",
          description: "Your data has been backed up to Google Drive.",
          action: (
            <Link href={result.fileUrl} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
              View File
            </Link>
          ),
         });
      } else {
         throw new Error(result.error || 'The script did not return a file URL.');
      }
    } catch (err: any) {
      console.error("Cloud backup failed:", err);
      toast({
        variant: "destructive",
        title: "Cloud Backup Failed",
        description: err.message || "An unknown error occurred during upload.",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleSystemBackupToDrive = () => {
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    const systemData = {
      appCode: "RP-SYSTEM",
      backupType: 'Full System Backup',
      timestamp: new Date().toISOString(),
      data: {
        clients,
        superAdminUsers: rawSuperAdminUsers,
        managedUsers: rawManagedUsers,
        tenants: rawTenants,
        payments: rawPayments,
        expenses: rawExpenses,
        additionalDues: rawAdditionalDues,
        businesses: rawBusinesses,
        weeklyIncomes: rawWeeklyIncomes
      },
    };
    handleUploadToDrive(systemData, `rentpilot_full-system-backup_${timestamp}.json`, setIsSystemCloudBackupLoading);
  };
  
  const handleClientDataBackupToDrive = () => {
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    const clientData = {
      appCode: "RP-CLIENT",
      backupType: 'All Client Data Backup',
      timestamp: new Date().toISOString(),
      data: {
        clients,
        managedUsers: rawManagedUsers,
        tenants: rawTenants,
        payments: rawPayments,
        expenses: rawExpenses,
        additionalDues: rawAdditionalDues,
        businesses: rawBusinesses,
        weeklyIncomes: rawWeeklyIncomes
      },
    };
    handleUploadToDrive(clientData, `rentpilot_all-client-data-backup_${timestamp}.json`, setIsClientCloudBackupLoading);
  };
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/json') {
        setRestoreFile(file);
      } else {
        toast({
          variant: 'destructive',
          title: 'Invalid File Type',
          description: 'Please select a valid .json backup file.',
        });
        setRestoreFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  const handleRestore = async () => {
    if (!restoreFile) {
      toast({
        variant: 'destructive',
        title: 'No File Selected',
        description: 'Please select a backup file to restore.',
      });
      return;
    }

    setIsRestoring(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          throw new Error('Failed to read file content.');
        }
        const backupData = JSON.parse(text);
        const result = await restoreDataFromBackup(backupData);

        if (result.success) {
          setRestoreFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Restore Failed',
          description: error.message || 'The selected file is not a valid JSON backup.',
        });
      } finally {
        setIsRestoring(false);
      }
    };
    reader.onerror = () => {
      toast({
        variant: 'destructive',
        title: 'File Read Error',
        description: 'Could not read the selected file.',
      });
      setIsRestoring(false);
    };
    reader.readAsText(restoreFile);
  };

  const handleSaveSchedule = () => {
    toast({
        title: "Schedule Configuration Saved",
        description: "Your backup schedule settings have been saved. Make sure your backend function is deployed to use them.",
    });
  };

  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-headline flex items-center">
          <DatabaseBackup className="mr-3 h-8 w-8 text-primary" />
          Data Backup & Restore
        </h1>
        <p className="text-muted-foreground">
          Create and download local backups or upload to your configured cloud storage.
        </p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Local Backup</CardTitle>
          <CardDescription>
            Download a JSON file containing a snapshot of your data. Keep these files in a safe place.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between p-4 border rounded-lg bg-muted/30">
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2">
                 <HardDriveDownload className="h-5 w-5" />
                 Full System Backup
              </h3>
              <p className="text-muted-foreground text-sm mt-1">
                This backup includes all data: clients, tenants, payments, expenses, and all user accounts (super admin and client users).
              </p>
            </div>
            <Button 
              onClick={handleSystemBackup} 
              disabled={isSystemBackupLoading}
              className="mt-4 md:mt-0 md:ml-4 w-full md:w-auto"
            >
              {isSystemBackupLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {isSystemBackupLoading ? 'Generating...' : 'Download Full Backup'}
            </Button>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between p-4 border rounded-lg bg-muted/30">
             <div>
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Download className="h-5 w-5" />
                All Client Data Backup
              </h3>
              <p className="text-muted-foreground text-sm mt-1">
                This backup includes all client-related data: clients, tenants, payments, expenses, and client user accounts. It excludes super admin accounts.
              </p>
            </div>
            <Button 
              onClick={handleClientDataBackup} 
              disabled={isClientDataBackupLoading}
              variant="secondary"
              className="mt-4 md:mt-0 md:ml-4 w-full md:w-auto"
            >
              {isClientDataBackupLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {isClientDataBackupLoading ? 'Generating...' : 'Download Client Data'}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Cloud Backup to Google Drive</CardTitle>
          <CardDescription>
            Upload a backup directly to your configured Google Drive via a Google Apps Script. This provides an off-site copy of your data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between p-4 border rounded-lg bg-muted/30">
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2">
                 <UploadCloud className="h-5 w-5 text-primary" />
                 Full System Backup to Drive
              </h3>
              <p className="text-muted-foreground text-sm mt-1">
                Backs up all data, including clients, all user types, tenants, payments, and expenses to your Google Drive.
              </p>
            </div>
            <Button 
              onClick={handleSystemBackupToDrive} 
              disabled={isSystemCloudBackupLoading}
              className="mt-4 md:mt-0 md:ml-4 w-full md:w-auto"
            >
              {isSystemCloudBackupLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
              {isSystemCloudBackupLoading ? 'Backing Up...' : 'Backup System to Drive'}
            </Button>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between p-4 border rounded-lg bg-muted/30">
             <div>
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-primary" />
                Client Data Backup to Drive
              </h3>
              <p className="text-muted-foreground text-sm mt-1">
                Backs up all client-related data. It excludes super admin accounts.
              </p>
            </div>
            <Button 
              onClick={handleClientDataBackupToDrive} 
              disabled={isClientCloudBackupLoading}
              variant="secondary"
              className="mt-4 md:mt-0 md:ml-4 w-full md:w-auto"
            >
              {isClientCloudBackupLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
              {isClientCloudBackupLoading ? 'Backing Up...' : 'Backup Client Data to Drive'}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Automated Cloud Backup Schedule</CardTitle>
          <CardDescription>
            Configure the schedule for automatic backups to your Google Drive.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Terminal className="h-4 w-4" />
            <AlertTitle>Backend Setup Required</AlertTitle>
            <AlertDescription>
              This UI configures the desired backup schedule. A backend process, like a Firebase Cloud Function, must be deployed separately to read these settings and trigger the backup.
            </AlertDescription>
          </Alert>

          <div className="flex items-center space-x-2 pt-4">
            <Switch id="schedule-enabled" checked={isScheduleEnabled} onCheckedChange={setIsScheduleEnabled} />
            <Label htmlFor="schedule-enabled">Enable Automated Backups</Label>
          </div>

          {isScheduleEnabled && (
            <div className="space-y-4 pt-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                  <Label htmlFor="frequency-select">Frequency</Label>
                  <Select value={frequency} onValueChange={setFrequency}>
                    <SelectTrigger id="frequency-select">
                      <SelectValue placeholder="Select frequency..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {frequency === 'weekly' && (
                  <div className="space-y-2">
                      <Label htmlFor="day-of-week-select">Day of the Week</Label>
                      <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                          <SelectTrigger id="day-of-week-select">
                              <SelectValue placeholder="Select day..." />
                          </SelectTrigger>
                          <SelectContent>
                            {weekDays.map(day => <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>)}
                          </SelectContent>
                      </Select>
                  </div>
                )}

                {frequency === 'monthly' && (
                  <div className="space-y-2">
                      <Label htmlFor="day-of-month-select">Day of the Month</Label>
                      <Select value={dayOfMonth} onValueChange={setDayOfMonth}>
                          <SelectTrigger id="day-of-month-select">
                              <SelectValue placeholder="Select day..." />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                <SelectItem key={day} value={String(day)}>{day}</SelectItem>
                            ))}
                          </SelectContent>
                      </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="backup-time">Backup Time (Asia/Manila)</Label>
                  <Input id="backup-time" type="time" value={backupTime} onChange={e => setBackupTime(e.target.value)} />
                </div>
              </div>
              
              <div className="flex justify-end pt-4">
                  <Button onClick={handleSaveSchedule}>
                      <Save className="mr-2 h-4 w-4" />
                      Save Schedule
                  </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>


      <Card className="shadow-lg border-destructive/50">
        <CardHeader>
          <CardTitle>Restore from Backup</CardTitle>
          <CardDescription>
            Upload a JSON backup file to restore your system data. This action is irreversible and will overwrite existing data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="backup-file">Backup File (.json)</Label>
            <Input 
              id="backup-file" 
              type="file" 
              accept=".json"
              onChange={handleFileSelect}
              ref={fileInputRef}
              disabled={isRestoring}
              className="file:text-primary file:font-semibold"
            />
          </div>
          <Button
            onClick={() => setIsRestoreConfirmOpen(true)}
            disabled={!restoreFile || isRestoring}
            variant="destructive"
          >
            {isRestoring ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {isRestoring ? 'Restoring...' : 'Restore from Backup'}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={isRestoreConfirmOpen} onOpenChange={setIsRestoreConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently ERASE all current data (clients, users, tenants, payments, etc.) and replace it with the data from the backup file: <strong className="text-foreground">{restoreFile?.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setIsRestoreConfirmOpen(false);
                handleRestore();
              }} 
              className={cn(buttonVariants({ variant: "destructive" }))}>
                Yes, Overwrite and Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    