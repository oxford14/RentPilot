
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, FileSignature, ShieldCheck, Eraser } from 'lucide-react';
import { format } from 'date-fns';
import type { SignedContract } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import SignatureCanvas from 'react-signature-canvas';

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
    const [manualInputs, setManualInputs] = useState<string[]>([]);
    const sigPad = useRef<SignatureCanvas | null>(null);

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
                    const inputCount = (foundContract.contractBody.match(/\{\{\{tenant_manual_input\}\}\}/g) || []).length;
                    setManualInputs(Array(inputCount).fill(''));
                }
            }
        }
        setIsLoading(false);
    }, [params.contractId, signedContracts, user, router, toast]);

    const handleSignContract = async () => {
        if (!contract) return;
        if (sigPad.current?.isEmpty()) {
            toast({ variant: 'destructive', title: 'Signature Required', description: 'Please provide your signature in the box.' });
            return;
        }
        const signatureDataUrl = sigPad.current!.toDataURL('image/png');
        setIsSubmitting(true);
        await signContract(contract.id, signatureDataUrl, manualInputs);
        router.push('/');
    };

    const handleManualInputChange = (index: number, value: string) => {
        const newInputs = [...manualInputs];
        newInputs[index] = value;
        setManualInputs(newInputs);
    };

    const renderContractBody = (body: string) => {
      const parts = body.split(/(\{\{\{tenant_manual_input\}\}\})/g);
      let inputIndex = 0;
      return parts.map((part, index) => {
        if (part === '{{{tenant_manual_input}}}') {
          const currentIndex = inputIndex;
          inputIndex++;
          return (
            <div key={index} className="my-4">
              <Textarea 
                placeholder="Enter details here..." 
                className="bg-background text-sm"
                value={manualInputs[currentIndex] || ''}
                onChange={(e) => handleManualInputChange(currentIndex, e.target.value)}
              />
            </div>
          );
        }
        // Use dangerouslySetInnerHTML for the other parts to render HTML (like the signature image)
        return <span key={index} dangerouslySetInnerHTML={{ __html: part.replace(/\n/g, '<br />') }} />;
      });
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
                        <ScrollArea className="h-[60vh] border rounded-md p-4 bg-muted/50">
                           <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: contract.contractBody.replace(/\n/g, '<br />') }} />
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
                    <ScrollArea className="h-[60vh] border rounded-md p-4 bg-muted/50">
                        <div className="whitespace-pre-wrap">{renderContractBody(contract.contractBody)}</div>
                    </ScrollArea>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                     <div className="w-full space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium">Your Signature</label>
                            <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={() => sigPad.current?.clear()}>
                                <Eraser className="mr-1 h-3 w-3" /> Clear
                            </Button>
                        </div>
                        <div className="w-full h-[150px] rounded-md border bg-background">
                            <SignatureCanvas
                                ref={sigPad}
                                penColor='black'
                                canvasProps={{className: 'w-full h-full'}}
                            />
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 self-start">
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
