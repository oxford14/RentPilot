
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { DatabaseBackup, Download, HardDriveDownload, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminBackupsPage() {
  const {
    clients,
    rawTenants,
    rawPayments,
    rawExpenses,
    rawManagedUsers,
    rawSuperAdminUsers,
  } = useAppContext();
  const { toast } = useToast();
  const [isSystemBackupLoading, setIsSystemBackupLoading] = useState(false);
  const [isClientDataBackupLoading, setIsClientDataBackupLoading] = useState(false);

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

          <div className="mt-8 p-4 border-l-4 border-yellow-400 bg-yellow-500/10 rounded-r-lg">
              <h4 className="font-semibold text-yellow-800">Important Note on Restoring Data</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Restoring from a backup is a manual process and is not currently available through this interface. Please contact system support for assistance with data restoration from a backup file.
              </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
