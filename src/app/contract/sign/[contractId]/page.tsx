
"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, FileSignature, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import type { SignedContract } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export default function SignContractPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useAuth();
    const { signedContracts, signContract } = useAppContext();

    const [contract, setContract] = useState<SignedContract | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [agreed, setAgreed] = useState(false);

    useEffect(() => {
        const contractId = params.contractId as string;
        if (signedContracts && contractId) {
            const foundContract = signedContracts.find(c => c.id === contractId);
            if (foundContract) {
                if (foundContract.tenantId !== user?.tenantId) {
                    toast({ variant: 'destructive', title: 'Unauthorized', description: 'You are not authorized to view this contract.' });
                    router.push('/');
                } else {
                    setContract(foundContract);
                }
            }
        }
        setIsLoading(false);
    }, [params.contractId, signedContracts, user, router, toast]);

    const handleSignContract = async () => {
        if (!contract) return;
        setIsSubmitting(true);
        await signContract(contract.id);
        router.push('/');
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!contract) {
        return <div className="flex justify-center items-center h-screen">Contract not found.</div>;
    }

    if (contract.status === 'signed') {
        return (
            <div className="container mx-auto py-8">
                <Card className="max-w-4xl mx-auto">
                    <CardHeader className="text-center">
                        <ShieldCheck className="mx-auto h-12 w-12 text-green-500" />
                        <CardTitle className="mt-4">Contract Already Signed</CardTitle>
                        <CardDescription>
                            This contract was signed on {format(new Date(contract.signedAt!), 'PPP ppp')}.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[60vh] border rounded-md p-4 bg-muted/50 whitespace-pre-wrap">
                            {contract.contractBody}
                        </ScrollArea>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={() => router.push('/')} className="mx-auto">Back to Dashboard</Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8">
            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <FileSignature className="mx-auto h-12 w-12 text-primary" />
                    <CardTitle className="mt-4">Review and Sign Your Contract</CardTitle>
                    <CardDescription>
                        Please read the following contract carefully. By signing, you agree to all terms and conditions.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[60vh] border rounded-md p-4 bg-muted/50 whitespace-pre-wrap">
                        {contract.contractBody}
                    </ScrollArea>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="terms" checked={agreed} onCheckedChange={(checked) => setAgreed(!!checked)} />
                        <label htmlFor="terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            I have read and agree to the terms of this contract.
                        </label>
                    </div>
                    <Button onClick={handleSignContract} disabled={!agreed || isSubmitting} className="w-full">
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Agree and Sign Contract
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

