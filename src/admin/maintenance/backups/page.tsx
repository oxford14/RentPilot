
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { DatabaseBackup, Download, HardDriveDownload, Loader2, UploadCloud, Save, Terminal, HardDriveUpload, ExternalLink } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import type { BackupScheduleSettings } from '@/lib/types';
import { pushBackupToGoogleDrive } from '@/actions/backup-actions';

export default function BackupsPage() {
  const { 
    backupScheduleSettings, 
    updateBackupScheduleSettings, 
    restoreFromBackup,
    clients,
    rawTenants,
    rawPayments,
    rawManagedUsers,
    rawSuperAdminUsers,
    rawExpenses,
    rawAdditionalDues,
    rawBusinesses,
    rawWeeklyIncomes,
   } = useAppContext();
  const { toast } = useToast();
  const [schedule, setSchedule] = useState<BackupScheduleSettings>({
    isScheduleEnabled: false,
    frequency: 'daily',
    weeklyDay: 1, // Monday
    dayOfMonth: 1,
    backupTime: '02:00',
  });
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [fileToRestore, setFileToRestore] = useState<any>(null);
  const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false);
  const [isPushing, setIsPushing] = useState(false);


  useEffect(() => {
    if (backupScheduleSettings) {
      setSchedule(backupScheduleSettings);
    }
  }, [backupScheduleSettings]);

  const generateBackupData = () => {
    return {
      backupType: "Full System Backup",
      timestamp: new Date().toISOString(),
      data: {
        clients,
        tenants: rawTenants,
        payments: rawPayments,
        managedUsers: rawManagedUsers,
        superAdminUsers: rawSuperAdminUsers,
        expenses: rawExpenses,
        additionalDues: rawAdditionalDues,
        businesses: rawBusinesses,
        weeklyIncomes: rawWeeklyIncomes,
      }
    };
  };

  const handleDownloadBackup = () => {
    const backupData = generateBackupData();
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backupData, null, 2))}`;
    const link = document.createElement('a');
    link.href = jsonString;
    link.download = `rentpilot-backup-${format(new Date(), 'yyyy-MM-dd-HH-mm-ss')}.json`;
    link.click();
    toast({ title: "Backup Downloading", description: "Your data is being downloaded as a JSON file." });
  };
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/json') {
        toast({ variant: 'destructive', title: 'Invalid File Type', description: 'Please upload a valid JSON backup file.' });
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const content = e.target?.result;
            if (typeof content !== 'string') throw new Error("File content is not readable.");
            const parsedData = JSON.parse(content);
            
            if (!parsedData.data || !parsedData.data.clients) {
                throw new Error("Invalid backup file structure.");
            }

            setFileToRestore(parsedData);
            setIsRestoreConfirmOpen(true);
        } catch (error) {
            console.error("Error parsing backup file:", error);
            toast({ variant: 'destructive', title: 'File Error', description: `Could not read or parse the backup file. ${(error as Error).message}` });
        }
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleRestoreConfirmed = async () => {
    if (!fileToRestore) return;
    setIsRestoreConfirmOpen(false);
    setIsRestoring(true);

    const result = await restoreFromBackup(fileToRestore);

    if (result.success) {
        toast({ title: 'Restore Complete', description: 'Your application data has been restored.' });
    }
    // Error toast is handled inside the context function
    
    setIsRestoring(false);
    setFileToRestore(null);
  };

  const handleSaveSchedule = async () => {
    setIsSaving(true);
    await updateBackupScheduleSettings(schedule);
    setIsSaving(false);
  };

  const handlePushBackup = async () => {
    setIsPushing(true);
    toast({ title: "Pushing backup to Google Drive...", description: "This may take a moment." });
    
    const backupData = generateBackupData();
    const result = await pushBackupToGoogleDrive(backupData);

    if (result.success && result.fileUrl) {
      toast({
          title: "Backup Successful!",
          description: "Your data has been pushed to Google Drive.",
          action: (
              <a href={result.fileUrl} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View File
              </a>
          ),
      });
    } else {
        toast({
            variant: "destructive",
            title: "Backup Failed",
            description: result.error || "An unknown error occurred.",
            duration: 9000,
        });
    }
    setIsPushing(false);
  };
  

  return (
    <>
    <div className="container mx-auto py-2 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-headline flex items-center">
          <DatabaseBackup className="mr-3 h-8 w-8 text-primary" />
          Backup & Restore
        </h1>
        <p className="text-muted-foreground">Manage your application data backups and system restore points.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="shadow-lg">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                      <HardDriveDownload className="w-5 h-5 text-primary" />
                      Manual Local Backup
                  </CardTitle>
                  <CardDescription>
                      Download a snapshot of your current data to your local machine.
                  </CardDescription>
              </CardHeader>
              <CardContent>
                  <Button onClick={handleDownloadBackup} className="w-full">
                      <Download className="mr-2 h-4 w-4" />
                      Download Full Backup
                  </Button>
              </CardContent>
          </Card>
          
          <Card className="shadow-lg">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                      <UploadCloud className="w-5 h-5 text-primary" />
                      Manual Cloud Backup
                  </CardTitle>
                  <CardDescription>
                      Push a complete data snapshot to your configured Google Drive.
                  </CardDescription>
              </CardHeader>
              <CardContent>
                  <Button onClick={handlePushBackup} disabled={isPushing} className="w-full">
                      {isPushing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <UploadCloud className="mr-2 h-4 w-4" />}
                      Push to Google Drive
                  </Button>
              </CardContent>
          </Card>


          <Card className="shadow-lg">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                      <HardDriveUpload className="w-5 h-5 text-primary" />
                      Restore from Backup
                  </CardTitle>
                  <CardDescription>
                      Upload a JSON backup file to restore application data.
                  </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                    <div className="space-y-1">
                        <Label htmlFor="backup-file">Backup File (.json)</Label>
                        <Input id="backup-file" type="file" accept=".json" onChange={handleFileSelect} ref={fileInputRef} disabled={isRestoring} />
                    </div>
                    {isRestoring && (
                        <div className="flex items-center text-sm text-muted-foreground">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Restoring data... Please do not navigate away.
                        </div>
                    )}
                </div>
              </CardContent>
          </Card>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-primary" />
            Automated Backups
          </CardTitle>
          <CardDescription>
            Configure a schedule for automatic cloud backups to Google Drive.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
              <Terminal className="h-4 w-4" />
              <AlertTitle>Developer Note</AlertTitle>
              <AlertDescription>
                The automated scheduling UI is for demonstration. The background function to execute these scheduled backups via your Google Apps Script is not yet implemented. Manual cloud backups are functional.
              </AlertDescription>
          </Alert>
          <div className="flex items-center space-x-2">
            <Switch
              id="schedule-enabled"
              checked={schedule.isScheduleEnabled}
              onCheckedChange={(checked) => setSchedule(p => ({...p, isScheduleEnabled: checked}))}
              disabled
            />
            <Label htmlFor="schedule-enabled" className="text-muted-foreground">Enable Automatic Backups (Coming Soon)</Label>
          </div>
        </CardContent>
      </Card>
    </div>
    <AlertDialog open={isRestoreConfirmOpen} onOpenChange={setIsRestoreConfirmOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will <strong className="text-destructive">completely overwrite</strong> all current application data with the content from the backup file. This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setFileToRestore(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleRestoreConfirmed} className={cn(buttonVariants({ variant: "destructive" }))}>
                    Yes, overwrite everything
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
