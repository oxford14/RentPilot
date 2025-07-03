
"use client";

import React, { useState, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { generateContract } from '@/ai/flows/generate-contract-flow';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileSignature, Signature } from 'lucide-react';
import type { Tenant, ContractTemplate } from '@/lib/types';
import { Label } from '../ui/label';

const signNowSchema = z.object({
  signature: z.string().min(3, { message: 'A full name is required for the signature.' }),
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
}

export function InPersonSigningDialog({ isOpen, onClose, tenant, template }: InPersonSigningDialogProps) {
    const { finalizeInPersonSignature } = useAppContext();
    const { user } = useAuth();
    const { toast } = useToast();
    const [generatedContract, setGeneratedContract] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<SignNowFormValues>({
        resolver: zodResolver(signNowSchema),
        defaultValues: { signature: '', agree: false },
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
    }, [isOpen, tenant, template, user, toast, onClose]);

    const onSubmit = async (data: SignNowFormValues) => {
        setIsSubmitting(true);
        await finalizeInPersonSignature(tenant, template.id, generatedContract, data.signature);
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
                        <ScrollArea className="flex-1 border rounded-md p-4 bg-muted/50 whitespace-pre-wrap">
                            {generatedContract}
                        </ScrollArea>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4 border-t">
                                <FormField
                                    control={form.control}
                                    name="signature"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                <Signature className="h-4 w-4"/>
                                                Tenant's Signature (Full Name)
                                            </FormLabel>
                                            <FormControl>
                                                <Input placeholder="Type full name here..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
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
