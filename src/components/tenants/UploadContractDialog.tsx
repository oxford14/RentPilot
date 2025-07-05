

"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';
import { Loader2, UploadCloud, CalendarClock, ArrowRight, Calendar } from 'lucide-react';
import type { Tenant } from '@/lib/types';
import { addMonths, addYears, format, addMinutes } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface UploadContractDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant | null;
}

// Helper to format a date object as a UTC date string to avoid timezone shifts in display
const formatUtcDateAsPPP = (date: Date | null): string => {
    if (!date) return 'N/A';
    // Adjust for the local timezone offset to display the correct UTC date
    const adjustedDate = addMinutes(date, date.getTimezoneOffset());
    return format(adjustedDate, 'PPP');
};


export function UploadContractDialog({ isOpen, onClose, tenant }: UploadContractDialogProps) {
  const { uploadSignedContract } = useAppContext();
  const { toast } = useToast();
  
  const [step, setStep] = useState<'duration' | 'upload'>('duration');
  const [duration, setDuration] = useState<number>(1);
  const [unit, setUnit] = useState<'years' | 'months'>('years');
  const [calculatedEndDate, setCalculatedEndDate] = useState<Date | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (tenant?.joinDate) {
        const joinDate = new Date(tenant.joinDate);
        let endDate;
        if (unit === 'months') {
            endDate = addMonths(joinDate, duration || 0);
        } else {
            endDate = addYears(joinDate, duration || 0);
        }
        setCalculatedEndDate(endDate);
    }
  }, [duration, unit, tenant]);

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
    if (!selectedFile || !tenant || !calculatedEndDate) {
      toast({ variant: "destructive", title: "Error", description: "Missing required information to upload contract." });
      return;
    }

    setIsLoading(true);
    await uploadSignedContract(tenant.id, selectedFile, calculatedEndDate.toISOString());
    setIsLoading(false);
    onClose();
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset state when dialog is closed
      setStep('duration');
      setDuration(1);
      setUnit('years');
      setSelectedFile(null);
      setIsLoading(false);
      onClose();
    }
  };
  
  const tenantJoinDate = tenant?.joinDate ? new Date(tenant.joinDate) : null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        {step === 'duration' && (
            <>
                <DialogHeader>
                    <DialogTitle>Set Contract Duration</DialogTitle>
                    <DialogDescription>
                        Specify the contract length for {tenant?.name}. The end date will be calculated from their join date ({formatUtcDateAsPPP(tenantJoinDate)}).
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="duration-number">Duration</Label>
                        <Input 
                            id="duration-number" 
                            type="number" 
                            value={duration} 
                            onChange={(e) => setDuration(parseInt(e.target.value, 10) || 0)}
                            min="1"
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="duration-unit">Unit</Label>
                        <Select value={unit} onValueChange={(value: 'years' | 'months') => setUnit(value)}>
                            <SelectTrigger id="duration-unit">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="years">Years</SelectItem>
                                <SelectItem value="months">Months</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                {calculatedEndDate && (
                    <div className="p-3 bg-muted rounded-md space-y-2 text-sm">
                         <div className="flex items-center justify-between">
                            <span className="text-muted-foreground flex items-center gap-2"><Calendar className="h-4 w-4"/>Start Date (from Join Date):</span>
                            <span className="font-semibold">{formatUtcDateAsPPP(tenantJoinDate)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-medium flex items-center gap-2"><CalendarClock className="h-4 w-4"/>Calculated Contract End Date:</span>
                            <span className="font-semibold">{formatUtcDateAsPPP(calculatedEndDate)}</span>
                        </div>
                    </div>
                )}
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={() => setStep('upload')} disabled={!duration || duration <= 0}>
                        Next <ArrowRight className="ml-2 h-4 w-4"/>
                    </Button>
                </DialogFooter>
            </>
        )}
        {step === 'upload' && (
             <>
                <DialogHeader>
                    <DialogTitle>Upload Signed Contract</DialogTitle>
                    <DialogDescription>
                        Please upload the signed PDF contract for {tenant?.name}.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                     <div className="p-3 bg-muted rounded-md flex items-center justify-between text-sm">
                        <span className="font-medium flex items-center gap-2"><CalendarClock className="h-4 w-4"/>Contract End Date:</span>
                        <span className="font-semibold">{formatUtcDateAsPPP(calculatedEndDate)}</span>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="contract-file">Contract (PDF only)</Label>
                        <Input id="contract-file" type="file" accept="application/pdf" onChange={handleFileChange} />
                    </div>
                    {selectedFile && (
                        <div className="text-sm text-muted-foreground">
                        Selected file: {selectedFile.name}
                        </div>
                    )}
                    {tenant && !tenant.hasAccount && (
                        <p className="text-xs text-muted-foreground p-2 bg-muted/50 rounded-md">
                            A notification about this contract will be sent to the tenant once their account is generated.
                        </p>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setStep('duration')}>Back</Button>
                    <Button onClick={handleUpload} disabled={!selectedFile || isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                        {isLoading ? 'Uploading...' : 'Upload & Save'}
                    </Button>
                </DialogFooter>
            </>
        )}
      </DialogContent>
    </Dialog>
  );
}
