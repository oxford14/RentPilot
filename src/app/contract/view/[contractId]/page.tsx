
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
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

// This page now uses params.contractId, but we treat it as a tenantId for logic.
export default function ContractViewerPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const { tenants, signedContracts } = useAppContext();

    const [contractSource, setContractSource] = useState<ContractSource>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const tenantId = params.contractId as string; // Read from params.contractId, but it's the tenant's ID

    const tenant = useMemo(() => {
        if (!tenantId) return null;
        return tenants.find(t => t.id === tenantId);
    }, [tenantId, tenants]);

    useEffect(() => {
        const fetchContract = async () => {
            if (!tenant) {
                // This might happen on first load before tenants array is populated.
                // The effect below will handle setting an error if it's still not found.
                return;
            }

            // Security check: ensure the user is authorized to view this
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
                } else {
                    // It's possible the contract data hasn't loaded yet.
                    // If still no contract after data loads, the final check will show "No Contract Found".
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
            // Case 3: No contract at all
            else {
                 // Do nothing here, let the final check handle it.
            }
            setIsLoading(false);
        };

        if (user && tenants.length > 0) {
            fetchContract();
        }

    }, [tenantId, tenant, signedContracts, user, tenants]);


    // This effect handles two cases:
    // 1. The initial data has loaded, but a tenant with the given ID was never found.
    // 2. The tenant was found, but they have neither an uploaded nor a signed contract.
    useEffect(() => {
      if (!isLoading) { // Only run after the initial loading attempt
          if (!tenant) {
            setError("Tenant not found.");
          } else if (!tenant.activeContractId && !tenant.contractUrl) {
            // setError("No contract is associated with this tenant.");
            // We'll just let the `!contractSource` block handle this to show a nicer message.
          }
      }
    }, [isLoading, tenant]);

    if (isLoading && tenants.length === 0) { // Show loader only on initial data load
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
