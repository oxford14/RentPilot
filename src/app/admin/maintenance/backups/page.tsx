
"use client";

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { DatabaseBackup, Download, HardDriveDownload, Loader2, Upload } from 'lucide-react';
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
import { cn } from '@/lib/utils';

export default function AdminBackupsPage() {
  const {
    clients,
    rawTenants,
    rawPayments,
    rawExpenses,
    rawManagedUsers,
    rawSuperAdminUsers,
    restoreDataFromBackup,
  } = useAppContext();
  const { toast } = useToast();
  const [isSystemBackupLoading, setIsSystemBackupLoading] = useState(false);
  const [isClientDataBackupLoading, setIsClientDataBackupLoading] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      },
    };
    handleDownloadJson(clientData, `rentpilot_all-client-data-backup_${timestamp}.json`);
    setIsClientDataBackupLoading(false);
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

  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-headline flex items-center">
          <DatabaseBackup className="mr-3 h-8 w-8 text-primary" />
          Data Backup & Restore
        </h1>
        <p className="text-muted-foreground">
          Create and download backups of your system and client data.
        </p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Create Backup</CardTitle>
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
