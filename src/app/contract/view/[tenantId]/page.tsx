
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, FileWarning, AlertTriangle } from 'lucide-react';
import { getUploadedContractAsBase64 } from '@/actions/contract-actions';
import type { Tenant, SignedContract } from '@/lib/types';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

type ContractSource = 
  | { type: 'signed', data: SignedContract }
  | { type: 'uploaded', data: string } // base64 pdf data
  | null;

export default function ContractViewerPage() {
    const params = useParams();
    const { user } = useAuth();
    const { tenants, signedContracts } = useAppContext();

    const [contractSource, setContractSource] = useState<ContractSource>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // The slug is named 'tenantId' because of the folder structure.
    const tenantId = params.tenantId as string;

    const tenant = useMemo(() => {
        if (!tenantId) return null;
        return tenants.find(t => t.id === tenantId);
    }, [tenantId, tenants]);

    useEffect(() => {
        // Wait until tenants are loaded
        if (tenants.length === 0 && isLoading) return;

        const fetchContract = async () => {
            if (!tenant) {
                setError("Tenant not found for the provided ID.");
                setIsLoading(false);
                return;
            }

            const isSuperAdmin = user?.isSuperAdmin;
            const isOwnerOrAdmin = user?.clientId === tenant.clientId;
            const isTheTenant = user?.tenantId === tenant.id;

            if (!isSuperAdmin && !isOwnerOrAdmin && !isTheTenant) {
                 setError("You are not authorized to view this contract.");
                 setIsLoading(false);
                 return;
            }

            // Case 1: Digitally Signed Contract
            if (tenant.activeContractId) {
                const contract = signedContracts.find(c => c.id === tenant.activeContractId);
                if (contract) {
                    setContractSource({ type: 'signed', data: contract });
                }
            } 
            // Case 2: Uploaded PDF Contract
            else if (tenant.contractUrl) {
                try {
                    const pdfBase64 = await getUploadedContractAsBase64(tenant.id);
                    if (pdfBase64) {
                        setContractSource({ type: 'uploaded', data: pdfBase64 });
                    } else {
                        setError("Could not retrieve the uploaded contract file.");
                    }
                } catch (err: any) {
                    setError(`Failed to load uploaded contract: ${err.message}`);
                }
            }
            setIsLoading(false);
        };

        fetchContract();

    }, [tenantId, tenant, tenants, signedContracts, user, isLoading]);


    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="ml-2">Loading contract...</p>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="container mx-auto py-8">
                <Alert variant="destructive" className="max-w-xl mx-auto">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error Loading Contract</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        );
    }
    
    if (!contractSource) {
         return (
            <div className="container mx-auto py-8 text-center">
                 <Card className="max-w-xl mx-auto">
                    <CardHeader>
                        <FileWarning className="mx-auto h-12 w-12 text-muted-foreground" />
                        <CardTitle>No Contract Found</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">There is no contract on file for this tenant.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-2">
             <Card className="shadow-xl">
                <CardHeader>
                    <CardTitle>Contract for {tenant?.name}</CardTitle>
                    <CardDescription>
                        {contractSource.type === 'signed' && contractSource.data.signedAt
                            ? `Digitally signed on ${new Date(contractSource.data.signedAt).toLocaleDateString()}`
                            : 'Uploaded PDF Document'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {contractSource.type === 'signed' ? (
                        <ScrollArea className="h-[calc(100vh-20rem)] border rounded-md p-4 bg-muted/30">
                           <div className="whitespace-pre-wrap prose prose-sm dark:prose-invert" dangerouslySetInnerHTML={{ __html: contractSource.data.contractBody.replace(/\n/g, '<br />') }} />
                        </ScrollArea>
                    ) : (
                         <iframe 
                            src={`data:application/pdf;base64,${contractSource.data}`}
                            className="w-full h-[calc(100vh-20rem)] border rounded-md"
                            title={`Contract for ${tenant?.name}`}
                         ></iframe>
                    )}
                </CardContent>
             </Card>
        </div>
    );
}
