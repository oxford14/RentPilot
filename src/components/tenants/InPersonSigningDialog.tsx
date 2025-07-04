

"use client";

import React, { useState, useEffect, useRef } from 'react';
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
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { generateContract } from '@/ai/flows/generate-contract-flow';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileSignature, PenLine, Eraser } from 'lucide-react';
import type { Tenant, ContractTemplate } from '@/lib/types';
import SignatureCanvas from 'react-signature-canvas';
import { cn } from '@/lib/utils';

const signNowSchema = z.object({
  agree: z.literal(true, {
    errorMap: () => ({ message: 'The tenant must agree to the terms to sign.' }),
  }),
});

type SignNowFormValues = z.infer<typeof signNowSchema>;

interface InPersonSigningDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant;
  template: ContractTemplate;
  contractEndDate: Date | null;
}

export function InPersonSigningDialog({ isOpen, onClose, tenant, template, contractEndDate }: InPersonSigningDialogProps) {
    const { finalizeInPersonSignature } = useAppContext();
    const { user } = useAuth();
    const { toast } = useToast();
    const [generatedContract, setGeneratedContract] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const sigPad = useRef<SignatureCanvas | null>(null);

    const form = useForm<SignNowFormValues>({
        resolver: zodResolver(signNowSchema),
        defaultValues: { agree: false },
    });

    useEffect(() => {
        if (!isOpen || !user) return;
        
        const generate = async () => {
            setIsLoading(true);
            try {
                const result = await generateContract({
                    templateBody: template.body,
                    tenant_name: tenant.name,
                    monthly_rate: tenant.monthlyRentalRate,
                    security_deposit: tenant.securityDeposit || 0,
                    join_date: new Date(tenant.joinDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }),
                    landlord_name: user.username,
                    todays_date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                    contract_end_date: contractEndDate ? contractEndDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }) : 'N/A',
                });
                setGeneratedContract(result.finalContract);
            } catch (e: any) {
                toast({ variant: 'destructive', title: 'Failed to Generate Contract', description: e.message });
                onClose();
            } finally {
                setIsLoading(false);
            }
        };

        generate();
    }, [isOpen, tenant, template, user, toast, onClose, contractEndDate]);
    
    useEffect(() => {
        // Clear signature pad when dialog opens
        if(isOpen) {
            sigPad.current?.clear();
            form.reset({ agree: false });
        }
    }, [isOpen, form]);

    const onSubmit = async (data: SignNowFormValues) => {
        if (sigPad.current?.isEmpty()) {
            toast({ variant: 'destructive', title: 'Signature Required', description: 'Please provide a signature in the box.' });
            return;
        }
        const signatureDataUrl = sigPad.current!.toDataURL('image/png');
        setIsSubmitting(true);
        await finalizeInPersonSignature(tenant, template.id, generatedContract, signatureDataUrl, contractEndDate);
        setIsSubmitting(false);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl flex flex-col h-full max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSignature className="h-6 w-6"/>
                        In-Person Signing for {tenant.name}
                    </DialogTitle>
                    <DialogDescription>
                        Please have the tenant review the contract below and provide their signature.
                    </DialogDescription>
                </DialogHeader>
                
                {isLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="mt-2 text-muted-foreground">Generating contract...</p>
                    </div>
                ) : (
                    <>
                        <ScrollArea className="flex-1 border rounded-md p-4 bg-muted/50">
                             <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: generatedContract.replace(/\n/g, '<br />') }} />
                        </ScrollArea>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4 border-t">
                                <FormItem>
                                    <FormLabel className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <PenLine className="h-4 w-4"/>
                                            Tenant's Signature
                                        </div>
                                        <Button type="button" variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs" onClick={() => sigPad.current?.clear()}>
                                            <Eraser className="mr-1 h-3 w-3"/>
                                            Clear
                                        </Button>
                                    </FormLabel>
                                    <FormControl>
                                        <div className="w-full h-[120px] rounded-md border bg-background">
                                            <SignatureCanvas
                                                ref={sigPad}
                                                penColor='black'
                                                canvasProps={{className: 'w-full h-full'}}
                                            />
                                        </div>
                                    </FormControl>
                                </FormItem>
                                <FormField
                                    control={form.control}
                                    name="agree"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                            <FormControl>
                                                <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>
                                                    By checking this box, the tenant acknowledges they have read and agree to the terms of this contract.
                                                </FormLabel>
                                                <FormMessage />
                                            </div>
                                        </FormItem>
                                    )}
                                />
                                <DialogFooter>
                                    <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                        Finalize & Save Contract
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
