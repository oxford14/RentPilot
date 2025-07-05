
"use client";

import React, { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import SignatureCanvas from 'react-signature-canvas';
import { useToast } from '@/hooks/use-toast';
import { Eraser, PenLine } from 'lucide-react';

// Base schema with optional fields
const landlordInfoSchema = z.object({
  landlordName: z.string().optional(),
  landlordPosition: z.string().optional(),
});

type FormValues = z.infer<typeof landlordInfoSchema>;

export interface LandlordInfo {
  name: string;
  position: string;
  signatureDataUrl: string | null; // Null if signature is not required
}

interface LandlordInfoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: LandlordInfo) => void;
  requiredFields: {
    name: boolean;
    position: boolean;
    signature: boolean;
  };
}

export function LandlordInfoDialog({ isOpen, onClose, onSubmit, requiredFields }: LandlordInfoDialogProps) {
  const { toast } = useToast();
  const sigPad = useRef<SignatureCanvas | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(
      // Use superRefine to add conditional validation based on requiredFields prop
      landlordInfoSchema.superRefine((data, ctx) => {
        if (requiredFields.name && (!data.landlordName || data.landlordName.length < 2)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['landlordName'],
            message: 'Name is required and must be at least 2 characters.',
          });
        }
        if (requiredFields.position && (!data.landlordPosition || data.landlordPosition.length < 2)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['landlordPosition'],
            message: 'Position is required and must be at least 2 characters.',
          });
        }
      })
    ),
    defaultValues: {
      landlordName: '',
      landlordPosition: '',
    },
  });

  const handleFormSubmit = (data: FormValues) => {
    if (requiredFields.signature && sigPad.current?.isEmpty()) {
      toast({ variant: 'destructive', title: 'Signature Required', description: 'Please provide a signature.' });
      return;
    }

    const signatureDataUrl = requiredFields.signature ? sigPad.current!.toDataURL('image/png') : null;

    onSubmit({
      name: data.landlordName || '',
      position: data.landlordPosition || '',
      signatureDataUrl: signatureDataUrl,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Landlord/Representative Details</DialogTitle>
          <DialogDescription>
            Please provide the following details for the contract. This information will be embedded in the document.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
            {requiredFields.name && (
              <FormField
                control={form.control}
                name="landlordName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Landlord/Representative Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {requiredFields.position && (
              <FormField
                control={form.control}
                name="landlordPosition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position</FormLabel>
                    <FormControl><Input placeholder="e.g., Property Manager, Owner" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {requiredFields.signature && (
              <FormItem>
                <div className="flex justify-between items-center">
                    <FormLabel className="flex items-center gap-2">
                        <PenLine className="h-4 w-4"/>
                        Signature
                    </FormLabel>
                    <Button type="button" variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs" onClick={() => sigPad.current?.clear()}>
                        <Eraser className="mr-1 h-3 w-3"/>
                        Clear
                    </Button>
                </div>
                <FormControl>
                    <div className="w-full h-[150px] rounded-md border bg-background">
                        <SignatureCanvas
                            ref={sigPad}
                            penColor='black'
                            canvasProps={{className: 'w-full h-full'}}
                        />
                    </div>
                </FormControl>
              </FormItem>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit">Confirm and Continue</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
