

"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';
import { Loader2, FileUp } from 'lucide-react';
import type { Tenant } from '@/lib/types';

interface ContractUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant;
  contractEndDate: Date | null;
}

export function ContractUploadDialog({ isOpen, onClose, tenant, contractEndDate }: ContractUploadDialogProps) {
  const { uploadContract } = useAppContext();
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type !== "application/pdf") {
        toast({ variant: "destructive", title: "Invalid File Type", description: "Please upload a PDF file." });
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({ variant: "destructive", title: "No File Selected", description: "Please select a contract to upload." });
      return;
    }
    setIsLoading(true);
    try {
      await uploadContract(tenant.id, selectedFile, contractEndDate);
      onClose();
    } catch (error) {
      // Error toast is already handled in the context function
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Contract for {tenant.name}</DialogTitle>
          <DialogDescription>
            Upload a PDF contract for this tenant. This will replace any existing contract file.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="contract-file">Contract (PDF only)</Label>
            <Input id="contract-file" type="file" accept=".pdf" onChange={handleFileChange} />
          </div>
          {selectedFile && (
            <div className="text-sm text-muted-foreground">
              Selected file: {selectedFile.name}
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
          </DialogClose>
          <Button onClick={handleUpload} disabled={!selectedFile || isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
            {isLoading ? 'Uploading...' : 'Upload Contract'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
