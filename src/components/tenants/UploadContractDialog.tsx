
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';
import { Loader2, UploadCloud } from 'lucide-react';
import type { Tenant } from '@/lib/types';

interface UploadContractDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant | null;
}

export function UploadContractDialog({ isOpen, onClose, tenant }: UploadContractDialogProps) {
  const { uploadSignedContract } = useAppContext();
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.type !== "application/pdf") {
        toast({ variant: "destructive", title: "Invalid File Type", description: "Please upload a PDF file." });
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !tenant) {
      toast({ variant: "destructive", title: "Error", description: "No file selected or tenant not found." });
      return;
    }

    setIsLoading(true);
    await uploadSignedContract(tenant.id, selectedFile);
    setIsLoading(false);
    onClose();
  };
  
  // Reset state when dialog closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedFile(null);
      setIsLoading(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Signed Contract</DialogTitle>
          <DialogDescription>
            Upload the signed PDF contract for {tenant?.name}. This will replace any existing contract file.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="contract-file">Contract (PDF only)</Label>
            <Input id="contract-file" type="file" accept="application/pdf" onChange={handleFileChange} />
          </div>
          {selectedFile && (
            <div className="text-sm text-muted-foreground">
              Selected file: {selectedFile.name}
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleUpload} disabled={!selectedFile || isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
            {isLoading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
