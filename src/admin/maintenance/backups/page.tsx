
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { DatabaseBackup, Download, Loader2, UploadCloud, HardDriveUpload, ExternalLink, ShieldAlert, Users, Server } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { pushBackupToGoogleDrive } from '@/actions/backup-actions';

export default function BackupsPage() {
  const { 
    rawClients,
    rawSuperAdminUsers,
    rawManagedUsers,
    rawTenants,
    rawPayments,
    rawExpenses,
    rawAdditionalDues,
    rawBusinesses,
    rawWeeklyIncomes,
    rawAnnouncements,
    rawCompanyFundsExpenses,
    restoreFromBackup 
  } = useAppContext();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [fileToRestore, setFileToRestore] = useState<any>(null);
  const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false);
  const [isPushingFull, setIsPushingFull] = useState(false);
  const [isPushingSystem, setIsPushingSystem] = useState(false);

  const generateFullBackupData = () => {
    return {
      backupType: "Full Data Backup",
      timestamp: new Date().toISOString(),
      data: {
        clients: rawClients,
        superAdminUsers: rawSuperAdminUsers,
        managedUsers: rawManagedUsers,
        tenants: rawTenants,
        payments: rawPayments,
        expenses: rawExpenses,
        additionalDues: rawAdditionalDues,
        businesses: rawBusinesses,
        weeklyIncomes: rawWeeklyIncomes,
        announcements: rawAnnouncements,
        companyFundsExpenses: rawCompanyFundsExpenses,
      }
    };
  };

  const generateSystemBackupData = () => {
    return {
      backupType: "System Data Backup",
      timestamp: new Date().toISOString(),
      data: {
        clients: rawClients,
        superAdminUsers: rawSuperAdminUsers,
        managedUsers: rawManagedUsers,
      }
    };
  };

  const handleDownloadBackup = (backupType: 'full' | 'system') => {
    const backupData = backupType === 'full' ? generateFullBackupData() : generateSystemBackupData();
    const filenamePrefix = backupType === 'full' ? 'rentpilot-full-backup' : 'rentpilot-system-backup';
    
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backupData, null, 2))}`;
    const link = document.createElement('a');
    link.href = jsonString;
    link.download = `${filenamePrefix}-${format(new Date(), 'yyyy-MM-dd')}.json`;
    link.click();
    toast({ title: "Backup Downloading", description: `Your ${backupType} data is being downloaded.` });
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
    
    setIsRestoring(false);
    setFileToRestore(null);
  };

  const handlePushBackup = async (backupType: 'full' | 'system') => {
    if (backupType === 'full') {
        setIsPushingFull(true);
    } else {
        setIsPushingSystem(true);
    }
    
    toast({ title: "Pushing backup to Google Drive...", description: "This may take a moment." });

    const backupData = backupType === 'full' ? generateFullBackupData() : generateSystemBackupData();
    const result = await pushBackupToGoogleDrive(backupData);

    if (result.success && result.fileUrl) {
      toast({
          title: "Backup Successful!",
          description: `Your ${backupType} data has been pushed to Google Drive.`,
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

    if (backupType === 'full') {
        setIsPushingFull(false);
    } else {
        setIsPushingSystem(false);
    }
  };
  
  return (
    <>
    <div className="container mx-auto py-2 space-y-8">
      <div className="mb-2">
        <h1 className="text-3xl font-bold font-headline flex items-center">
          <DatabaseBackup className="mr-3 h-8 w-8 text-primary" />
          Backup & Restore
        </h1>
        <p className="text-muted-foreground">Manage your application data backups and system restore points.</p>
      </div>

      {/* Client Data Backup Section */}
      <div className="space-y-4">
        <div className="pl-2">
            <h2 className="text-2xl font-semibold font-headline flex items-center gap-2"><Users className="h-6 w-6 text-primary"/>Client Data Backup</h2>
            <p className="text-muted-foreground">Manage backups for tenants, transactions, and other client-related data.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-base">Manual Local Backup</CardTitle>
                    <CardDescription className="text-xs">Download a snapshot of your current client data to your local machine.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => handleDownloadBackup('full')} className="w-full">
                        <Download className="mr-2 h-4 w-4" />
                        Download Full Backup
                    </Button>
                </CardContent>
            </Card>
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-base">Manual Cloud Backup</CardTitle>
                    <CardDescription className="text-xs">Push a complete data snapshot to your configured cloud storage.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => handlePushBackup('full')} disabled={isPushingFull} className="w-full">
                        {isPushingFull ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <UploadCloud className="mr-2 h-4 w-4" />}
                        Push Full Backup
                    </Button>
                </CardContent>
            </Card>
            <Card className="shadow-lg">
              <CardHeader>
                  <CardTitle className="text-base">Restore from Backup</CardTitle>
                  <CardDescription className="text-xs">Upload a JSON backup file to restore client data. This will overwrite all existing data.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                    <div className="space-y-1">
                        <Label htmlFor="backup-file" className="sr-only">Backup File</Label>
                        <Input id="backup-file" type="file" accept=".json" onChange={handleFileSelect} ref={fileInputRef} disabled={isRestoring} />
                    </div>
                    {isRestoring && (
                        <div className="flex items-center text-sm text-muted-foreground">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Restoring data... Please wait.
                        </div>
                    )}
                </div>
              </CardContent>
            </Card>
        </div>
      </div>
      
       {/* System Backup Section */}
       <div className="space-y-4">
        <div className="pl-2">
            <h2 className="text-2xl font-semibold font-headline flex items-center gap-2"><Server className="h-6 w-6 text-primary"/>System Data Backup</h2>
            <p className="text-muted-foreground">Manage backups for system functionality and user configurations.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-base">Manual Local Backup</CardTitle>
                    <CardDescription className="text-xs">Download a snapshot of system configurations and users.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => handleDownloadBackup('system')} className="w-full">
                        <Download className="mr-2 h-4 w-4" />
                        Download System Backup
                    </Button>
                </CardContent>
            </Card>
             <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-base">Manual Cloud Backup</CardTitle>
                    <CardDescription className="text-xs">Push a system data snapshot to your configured cloud storage.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => handlePushBackup('system')} disabled={isPushingSystem} className="w-full">
                        {isPushingSystem ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <UploadCloud className="mr-2 h-4 w-4" />}
                        Push System Backup
                    </Button>
                </CardContent>
            </Card>
            <Card className="shadow-lg opacity-50 cursor-not-allowed">
              <CardHeader>
                  <CardTitle className="text-base">Restore System Data</CardTitle>
                  <CardDescription className="text-xs">System restore is handled via full restore. This option is disabled.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button disabled className="w-full">
                    <HardDriveUpload className="mr-2 h-4 w-4" />
                    Restore
                </Button>
              </CardContent>
            </Card>
        </div>
      </div>
      
       <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Important Note on Restoring</AlertTitle>
          <AlertDescription>
            Restoring a backup is an "all or nothing" operation. It will completely overwrite all existing data in your application with the data from the selected backup file. This action cannot be undone.
          </AlertDescription>
      </Alert>

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
